import type { CategoryId, Job, JobStatus } from "./data";
import { getSupabase } from "./supabase";

const TASKS_KEY = "jobtag:tasks";

interface StorageBackend {
  get(key: string, durable?: boolean): Promise<{ value: string } | null>;
  set(key: string, value: string, durable?: boolean): Promise<void>;
}

const localBackend: StorageBackend = {
  async get(key) {
    const raw = localStorage.getItem(key);
    return raw === null ? null : { value: raw };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
};

function backend(): StorageBackend {
  const win = window as unknown as { storage?: Partial<StorageBackend> };
  return typeof win.storage?.get === "function" && typeof win.storage?.set === "function"
    ? (win.storage as StorageBackend)
    : localBackend;
}

/** Generic persistence: prefers the sandbox window.storage, falls back to localStorage. */
export async function kvGet(key: string): Promise<string | null> {
  try {
    const res = await backend().get(key, true);
    return res?.value ?? null;
  } catch {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

export async function kvSet(key: string, value: string): Promise<boolean> {
  try {
    await backend().set(key, value, true);
    return true;
  } catch {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function parse(raw: string | null | undefined): Job[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Job[]) : null;
  } catch {
    return null;
  }
}

interface JobRow {
  id: string;
  title: string;
  category: string;
  price: number;
  location: string;
  note: string;
  status: string;
  posted: number;
  custom_label: string | null;
  claimed_by: string | null;
  claimed_at: number | null;
  posted_by: string | null;
  completed_at: number | null;
  promoted: boolean;
  promoted_at: number | null;
  poster_email: string | null;
  notify_email: boolean;
}

function toRow(j: Job): JobRow {
  return {
    id: j.id,
    title: j.title,
    category: j.category,
    price: j.price,
    location: j.location,
    note: j.note,
    status: j.status,
    posted: j.posted,
    custom_label: j.customLabel ?? null,
    claimed_by: j.claimedBy ?? null,
    claimed_at: j.claimedAt ?? null,
    posted_by: j.postedBy ?? null,
    completed_at: j.completedAt ?? null,
    promoted: j.promoted ?? false,
    promoted_at: j.promotedAt ?? null,
    poster_email: j.posterEmail ?? null,
    notify_email: j.notifyEmail ?? false,
  };
}

function toJob(r: JobRow): Job {
  const job: Job = {
    id: r.id,
    title: r.title,
    category: r.category as CategoryId,
    price: Number(r.price),
    location: r.location,
    note: r.note,
    status: r.status as JobStatus,
    posted: r.posted,
    ...(r.custom_label ? { customLabel: r.custom_label } : {}),
    ...(r.claimed_by ? { claimedBy: r.claimed_by } : {}),
    ...(r.claimed_at != null ? { claimedAt: r.claimed_at } : {}),
    ...(r.posted_by ? { postedBy: r.posted_by } : {}),
    ...(r.completed_at != null ? { completedAt: r.completed_at } : {}),
    ...(r.promoted ? { promoted: true } : {}),
    ...(r.promoted_at != null ? { promotedAt: r.promoted_at } : {}),
    ...(r.poster_email ? { posterEmail: r.poster_email } : {}),
    ...(r.notify_email ? { notifyEmail: true } : {}),
  };
  return job;
}

export async function loadTasks(): Promise<Job[] | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("posted", { ascending: false });
    if (error) return null;
    const rows = (data as JobRow[] | null) ?? [];
    return rows.map(toJob);
  }
  try {
    return parse(await kvGet(TASKS_KEY));
  } catch {
    return null;
  }
}

export async function saveTasks(tasks: Job[]): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    // Demo-scale sync: replace the jobs table contents with the current list.
    const { error: del } = await supabase
      .from("jobs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (del) return false;
    if (tasks.length === 0) return true;
    const { error: ins } = await supabase.from("jobs").insert(tasks.map(toRow));
    return !ins;
  }
  return kvSet(TASKS_KEY, JSON.stringify(tasks));
}