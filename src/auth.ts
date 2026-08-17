import { getSupabase } from "./supabase";
import { kvGet, kvSet } from "./storage";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: number;
  xp: number;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
}

/* ------------------------------------------------------------------ */
/* Local-demo fallback (used when Supabase is not configured)          */
/* ------------------------------------------------------------------ */

interface StoredUser {
  id: string;
  email: string;
  name: string;
  createdAt: number;
  salt: string;
  passHash: string;
  xp: number;
}

interface StoredSession {
  userId: string;
  token: string;
  createdAt: number;
}

const USERS_KEY = "jobtag:users";
const SESSION_KEY = "jobtag:session";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2);
  const out = new Uint8Array(buf);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function randomHex(bytes: number): string {
  try {
    return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)));
  } catch {
    let s = "";
    for (let i = 0; i < bytes; i++) {
      s += Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0");
    }
    return s;
  }
}

/** Non-crypto fallback only for insecure contexts; PBKDF2 is used whenever available. */
function fallbackHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return fallbackHash(password + "::" + saltHex);
  try {
    const material = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
      "deriveBits",
    ]);
    const bits = await subtle.deriveBits(
      { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: 100_000, hash: "SHA-256" },
      material,
      256,
    );
    return bytesToHex(new Uint8Array(bits));
  } catch {
    return fallbackHash(password + "::" + saltHex);
  }
}

async function loadUsers(): Promise<StoredUser[]> {
  const raw = await kvGet(USERS_KEY);
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? (v as StoredUser[]) : [];
  } catch {
    return [];
  }
}

async function saveUsers(users: StoredUser[]): Promise<void> {
  await kvSet(USERS_KEY, JSON.stringify(users));
}

function toPublic(u: StoredUser): AuthUser {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt, xp: u.xp };
}

async function startSession(userId: string): Promise<void> {
  const session: StoredSession = {
    userId,
    token: await randomHex(32),
    createdAt: Date.now(),
  };
  await kvSet(SESSION_KEY, JSON.stringify(session));
}

/* ------------------------------------------------------------------ */
/* Supabase helpers                                                    */
/* ------------------------------------------------------------------ */

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  xp: number;
}

async function fetchProfile(userId: string): Promise<AuthUser | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, xp")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const p = data as ProfileRow;
  return {
    id: p.id,
    email: p.email,
    name: p.name || p.email.split("@")[0],
    createdAt: Date.now(),
    xp: p.xp ?? 0,
  };
}

async function ensureProfile(userId: string, email: string, name?: string): Promise<AuthUser> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from("profiles").upsert(
      { id: userId, email, name: name?.trim() || email.split("@")[0], xp: 0 },
      { onConflict: "id" },
    );
  }
  const profile = await fetchProfile(userId);
  return (
    profile ?? {
      id: userId,
      email,
      name: name?.trim() || email.split("@")[0],
      createdAt: Date.now(),
      xp: 0,
    }
  );
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function signUp(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) return { ok: false, error: error?.message ?? "Sign up failed." };
    const user = await ensureProfile(data.user.id, data.user.email ?? email, input.name);
    return { ok: true, user };
  }

  const users = await loadUsers();
  if (users.some((u) => u.email === email)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const salt = await randomHex(16);
  const user: StoredUser = {
    id: `u_${await randomHex(8)}`,
    email,
    name: input.name?.trim() || email.split("@")[0],
    createdAt: Date.now(),
    salt,
    passHash: await hashPassword(password, salt),
    xp: 0,
  };
  await saveUsers([...users, user]);
  await startSession(user.id);
  return { ok: true, user: toPublic(user) };
}

export async function signIn(emailIn: string, password: string): Promise<AuthResult> {
  const email = emailIn.trim().toLowerCase();

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { ok: false, error: error?.message ?? "Sign in failed." };
    const user = await ensureProfile(data.user.id, data.user.email ?? email);
    return { ok: true, user };
  }

  const users = await loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return { ok: false, error: "No account found for this email." };

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passHash) return { ok: false, error: "Incorrect password." };

  await startSession(user.id);
  return { ok: true, user: toPublic(user) };
}

export async function restoreSession(): Promise<AuthUser | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    return ensureProfile(u.id, u.email ?? "");
  }

  const raw = await kvGet(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as StoredSession;
    if (!session?.userId || !session?.token) return null;
    const users = await loadUsers();
    const user = users.find((u) => u.id === session.userId);
    return user ? toPublic(user) : null;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
    return;
  }
  await kvSet(SESSION_KEY, "");
}

export async function awardXp(userId: string, amount: number): Promise<AuthUser | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc("increment_xp", { target: userId, amount });
    if (error) return null;
    return fetchProfile(userId);
  }

  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  users[idx].xp = (users[idx].xp ?? 0) + amount;
  await saveUsers(users);
  return toPublic(users[idx]);
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const supabase = getSupabase();
  if (supabase) {
    return fetchProfile(userId);
  }

  const users = await loadUsers();
  const u = users.find((x) => x.id === userId);
  return u ? toPublic(u) : null;
}