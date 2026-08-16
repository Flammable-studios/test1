import type { Job } from "./data";

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

export async function loadTasks(): Promise<Job[] | null> {
  try {
    return parse(await kvGet(TASKS_KEY));
  } catch {
    return null;
  }
}

export async function saveTasks(tasks: Job[]): Promise<boolean> {
  return kvSet(TASKS_KEY, JSON.stringify(tasks));
}