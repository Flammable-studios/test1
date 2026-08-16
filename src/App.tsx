import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, LogIn, Plus } from "lucide-react";
import { CATEGORIES, SEED, type CategoryId, type Job } from "./data";
import { loadTasks, saveTasks } from "./storage";
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from "./settings";
import { awardXp, getUserById, restoreSession, signOut, type AuthUser } from "./auth";
import { levelInfo, XP_COMPLETE, XP_POST } from "./xp";
import { styles } from "./styles";
import { JobCard } from "./components/JobCard";
import { JobDetail } from "./components/JobDetail";
import { AuthModal } from "./components/AuthModal";
import { SettingsModal } from "./components/SettingsModal";
import { PostForm } from "./components/PostForm";
import { Toast } from "./components/Toast";
import { AdBanner, AdCard } from "./components/AdSlot";

type Tab = "find" | "post" | "mine" | "posted";
type ModalState =
  | { type: "job"; jobId: string }
  | { type: "auth" }
  | { type: "settings" }
  | null;

export default function App() {
  const [tab, setTab] = useState<Tab>("find");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<CategoryId | "all">("all");
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [modal, setModal] = useState<ModalState>(null);
  const [pendingClaim, setPendingClaim] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadTasks(), restoreSession(), loadSettings()]).then(
      ([stored, sessionUser, prefs]) => {
        if (!alive) return;
        setJobs(stored && stored.length > 0 ? stored : SEED);
        setUser(sessionUser);
        setSettings(prefs);
        if (prefs.reduceMotion) document.documentElement.classList.add("force-reduce");
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  // Keep "x ago" times honest even when the tab sits open.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const persist = useCallback(async (next: Job[]) => {
    setJobs(next);
    setSaving(true);
    try {
      await saveTasks(next);
    } finally {
      setSaving(false);
    }
  }, []);

  /** Award XP and surface level-ups through the toast. */
  const award = useCallback(
    async (u: AuthUser, amount: number, onAwarded: (msg: string | null) => void) => {
      const before = levelInfo(u.xp);
      const updated = await awardXp(u.id, amount);
      if (!updated) return;
      setUser(updated);
      const after = levelInfo(updated.xp);
      if (after.level > before.level) {
        onAwarded(`Level up! You're now ${after.title} (Lv ${after.level}).`);
      } else {
        onAwarded(null);
      }
    },
    [],
  );

  const doClaim = useCallback(
    (id: string, u: AuthUser) => {
      if (!jobs) return;
      const target = jobs.find((j) => j.id === id);
      if (!target || target.status !== "open") return;
      if (target.postedBy === u.id) {
        flash("This is your own job — you can't claim it.");
        return;
      }
      void persist(
        jobs.map((j) =>
          j.id === id
            ? { ...j, status: "claimed", claimedBy: u.id, claimedAt: Date.now() }
            : j,
        ),
      );
      flash("Claimed — message the poster to confirm timing.");
      setModal((m) => (m?.type === "job" ? null : m));
    },
    [jobs, persist, flash],
  );

  const requestClaim = useCallback(
    (id: string) => {
      if (user) {
        doClaim(id, user);
      } else {
        setPendingClaim(id);
        setModal({ type: "auth" });
      }
    },
    [user, doClaim],
  );

  const doComplete = useCallback(
    (id: string) => {
      if (!jobs) return;
      const job = jobs.find((j) => j.id === id);
      if (!job || job.status !== "claimed" || !job.claimedBy) return;
      void persist(
        jobs.map((j) =>
          j.id === id ? { ...j, status: "complete", completedAt: Date.now() } : j,
        ),
      );
      void (async () => {
        const claimant = await getUserById(job.claimedBy as string);
        const before = claimant ? levelInfo(claimant.xp) : null;
        const updated = await awardXp(job.claimedBy as string, XP_COMPLETE);
        if (updated) {
          const after = levelInfo(updated.xp);
          if (before && after.level > before.level) {
            flash(
              `${updated.name} leveled up to ${after.title} (Lv ${after.level}) — job complete!`,
            );
          } else {
            flash(`Marked complete — ${updated.name} earned +${XP_COMPLETE} XP.`);
          }
        } else {
          flash("Job marked complete.");
        }
      })();
      setModal((m) => (m?.type === "job" ? null : m));
    },
    [jobs, persist, flash],
  );

  const requestComplete = useCallback(
    (id: string) => {
      if (user) {
        doComplete(id);
      } else {
        setModal({ type: "auth" });
      }
    },
    [user, doComplete],
  );

  const openJob = useCallback((id: string) => setModal({ type: "job", jobId: id }), []);

  const handleAuthed = useCallback(
    (u: AuthUser) => {
      setUser(u);
      setModal(null);
      if (pendingClaim) {
        const id = pendingClaim;
        setPendingClaim(null);
        doClaim(id, u);
      }
    },
    [pendingClaim, doClaim],
  );

  const handlePostSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setModal({ type: "auth" });
      return;
    }
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const category = String(data.get("category") || "junk") as CategoryId;
    const price = Number(String(data.get("price") ?? ""));
    const location = String(data.get("location") ?? "").trim();
    const note = String(data.get("note") ?? "").trim();
    const customLabel =
      category === "other" ? String(data.get("customLabel") ?? "").trim() : "";
    if (!title || !Number.isFinite(price) || price < 1 || !location) return;

    const job: Job = {
      id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      title,
      category,
      price: Math.round(price),
      location,
      note,
      status: "open",
      posted: Date.now(),
      postedBy: user.id,
      ...(customLabel ? { customLabel } : {}),
    };
    void persist([job, ...(jobs ?? [])]);
    e.currentTarget.reset();
    setTab("find");
    await award(user, XP_POST, (levelUpMsg) => {
      flash(levelUpMsg ?? "Job posted — +10 XP.");
    });
  };

  const handleSettingsChange = useCallback((next: Settings) => {
    setSettings(next);
    void saveSettings(next);
    document.documentElement.classList.toggle("force-reduce", next.reduceMotion);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    setModal(null);
    flash("Signed out.");
  }, [flash]);

  const handleResetData = useCallback(async () => {
    await saveTasks(SEED);
    setJobs(SEED);
    setModal(null);
    flash("Demo data reset.");
  }, [flash]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<
      CategoryId,
      number
    >;
    for (const j of jobs ?? []) {
      if (j.status === "open") map[j.category] += 1;
    }
    return map;
  }, [jobs]);

  const openTotal = useMemo(
    () => (jobs ?? []).filter((j) => j.status === "open").length,
    [jobs],
  );

  const visible = useMemo(
    () =>
      (jobs ?? [])
        .slice()
        .sort((a, b) => b.posted - a.posted)
        .filter((j) => filter === "all" || j.category === filter),
    [jobs, filter],
  );

  const mine = useMemo(
    () =>
      user
        ? (jobs ?? [])
            .filter((j) => j.claimedBy === user.id)
            .sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0))
        : [],
    [jobs, user],
  );

  const posted = useMemo(
    () =>
      user
        ? (jobs ?? [])
            .filter((j) => j.postedBy === user.id)
            .sort((a, b) => b.posted - a.posted)
        : [],
    [jobs, user],
  );

  const modalJob = useMemo(
    () => (modal?.type === "job" ? (jobs ?? []).find((j) => j.id === modal.jobId) ?? null : null),
    [modal, jobs],
  );

  if (jobs === null) {
    return (
      <div style={styles.loadingWrap}>
        <Loader2 size={22} className="jt-spin" />
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoRow}>
            <div style={styles.logo}>
              <span style={styles.logoA}>JOB</span>
              <span style={styles.logoB}>TAG</span>
            </div>
            <div style={styles.headerRight}>
              <span style={styles.headerStat}>
                {openTotal} open {openTotal === 1 ? "job" : "jobs"}
              </span>
              {user ? (
                <>
                  <span
                    style={styles.levelPill}
                    title={`${levelInfo(user.xp).title} · ${user.xp} XP`}
                  >
                    Lv{levelInfo(user.xp).level}
                  </span>
                  <button
                    type="button"
                    style={styles.avatar}
                    onClick={() => setModal({ type: "settings" })}
                    aria-label={`Open settings for ${user.name}`}
                    title={user.name}
                  >
                    {initials(user.name)}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  style={styles.signInBtn}
                  onClick={() => setModal({ type: "auth" })}
                >
                  <LogIn size={13} /> Sign in
                </button>
              )}
            </div>
          </div>
          <nav style={styles.tabs} aria-label="Browse or post jobs">
            {(
              [
                { id: "find", label: "Find work" },
                { id: "post", label: "Post a job" },
                { id: "mine", label: "My claims" },
                { id: "posted", label: "My jobs" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                className="jt-tab-btn"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "true" : undefined}
                style={{ ...styles.tabBtn, ...(tab === t.id ? styles.tabBtnActive : {}) }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        {tab === "find" && (
          <>
            <section style={styles.hero}>
              <div>
                <p style={styles.heroEyebrow}>Local odds &amp; ends</p>
                <h2 style={styles.heroTitle}>Quick cash jobs, right in your neighborhood.</h2>
                <p style={styles.heroSub}>
                  {openTotal} open {openTotal === 1 ? "job" : "jobs"} looking for a hand nearby.
                </p>
              </div>
              <button type="button" style={styles.heroCta} onClick={() => setTab("post")}>
                <Plus size={15} /> Post a job
              </button>
            </section>

            <AdBanner />

            <div style={styles.filterRow}>
              <button
                type="button"
                className="jt-chip"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
                style={{ ...styles.chip, ...(filter === "all" ? styles.chipActive : {}) }}
              >
                All jobs
                <span style={{ ...styles.chipCount, ...(filter === "all" ? styles.chipCountOn : {}) }}>
                  {openTotal}
                </span>
              </button>
              {CATEGORIES.map((c) => {
                const active = filter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="jt-chip"
                    aria-pressed={active}
                    onClick={() => setFilter(c.id)}
                    style={{
                      ...styles.chip,
                      ...(active ? { background: c.color, color: "#F7F5F0", borderColor: c.color } : {}),
                    }}
                  >
                    {c.label}
                    <span style={{ ...styles.chipCount, ...(active ? styles.chipCountOn : {}) }}>
                      {counts[c.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <div style={styles.empty}>
                <p style={styles.emptyTitle}>No jobs in this category yet.</p>
                <p style={styles.emptySub}>Be the first to post one — it takes under a minute.</p>
                <button type="button" style={styles.emptyCta} onClick={() => setTab("post")}>
                  <Plus size={15} /> Post a job
                </button>
              </div>
            ) : (
              <>
                <div className="jt-grid">
                  {visible.map((job, i) => (
                    <Fragment key={job.id}>
                      {i > 0 && i % 4 === 0 && <AdCard />}
                      <JobCard
                        job={job}
                        now={now}
                        yours={user ? job.claimedBy === user.id : false}
                        isOwner={user ? job.postedBy === user.id : false}
                        onOpen={openJob}
                        onClaim={requestClaim}
                        onComplete={requestComplete}
                      />
                    </Fragment>
                  ))}
                </div>
                <p style={styles.adDisclaimer}>
                  This demo shows placeholder ads — ads keep JobTag free to run.
                </p>
              </>
            )}
          </>
        )}

        {tab === "post" && (
          <PostForm
            onSubmit={(e) => void handlePostSubmit(e)}
            onCancel={() => setTab("find")}
            saving={saving}
            posterName={user?.name}
            prefillArea={settings.area}
          />
        )}

        {tab === "mine" &&
          (user ? (
            mine.length === 0 ? (
              <div style={styles.empty}>
                <p style={styles.emptyTitle}>No claims yet.</p>
                <p style={styles.emptySub}>
                  Claim a job from “Find work” to see it here and start earning XP.
                </p>
                <button type="button" style={styles.emptyCta} onClick={() => setTab("find")}>
                  Browse jobs
                </button>
              </div>
            ) : (
              <div className="jt-grid">
                {mine.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    now={now}
                    yours
                    onOpen={openJob}
                    onClaim={requestClaim}
                    onComplete={requestComplete}
                  />
                ))}
              </div>
            )
          ) : (
            <div style={styles.empty}>
              <p style={styles.emptyTitle}>Sign in to see your claims</p>
              <p style={styles.emptySub}>Claimed jobs and your XP live on your account.</p>
              <button
                type="button"
                style={styles.emptyCta}
                onClick={() => setModal({ type: "auth" })}
              >
                <LogIn size={15} /> Sign in
              </button>
            </div>
          ))}

        {tab === "posted" &&
          (user ? (
            posted.length === 0 ? (
              <div style={styles.empty}>
                <p style={styles.emptyTitle}>You haven't posted any jobs yet.</p>
                <p style={styles.emptySub}>
                  Post a job and mark it complete once a tasker finishes to award them XP.
                </p>
                <button type="button" style={styles.emptyCta} onClick={() => setTab("post")}>
                  <Plus size={15} /> Post a job
                </button>
              </div>
            ) : (
              <div className="jt-grid">
                {posted.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    now={now}
                    isOwner
                    onOpen={openJob}
                    onClaim={requestClaim}
                    onComplete={requestComplete}
                  />
                ))}
              </div>
            )
          ) : (
            <div style={styles.empty}>
              <p style={styles.emptyTitle}>Sign in to manage your jobs</p>
              <p style={styles.emptySub}>Your posted jobs and completions live on your account.</p>
              <button
                type="button"
                style={styles.emptyCta}
                onClick={() => setModal({ type: "auth" })}
              >
                <LogIn size={15} /> Sign in
              </button>
            </div>
          ))}
      </main>

      {tab === "find" && (
        <button
          type="button"
          className="jt-fab"
          style={styles.fab}
          onClick={() => setTab("post")}
          aria-label="Post a job"
        >
          <Plus size={22} color="#F7F5F0" />
        </button>
      )}

      {modalJob ? (
        <JobDetail
          job={modalJob}
          now={now}
          authed={!!user}
          isOwner={user ? modalJob.postedBy === user.id : false}
          onClose={() => setModal(null)}
          onClaim={requestClaim}
          onComplete={requestComplete}
          onRequireAuth={() => setModal({ type: "auth" })}
        />
      ) : null}

      {modal?.type === "auth" ? (
        <AuthModal
          onClose={() => {
            setModal(null);
            setPendingClaim(null);
          }}
          onAuthed={handleAuthed}
        />
      ) : null}

      {modal?.type === "settings" && user ? (
        <SettingsModal
          user={user}
          settings={settings}
          onChange={handleSettingsChange}
          onSignOut={() => void handleSignOut()}
          onResetData={() => void handleResetData()}
          onClose={() => setModal(null)}
        />
      ) : null}

      <Toast message={toast} saving={saving} />
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const base = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return base.toUpperCase();
}