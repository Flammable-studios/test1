import { kvGet, kvSet } from "./storage";

export interface Settings {
  /** Default neighborhood for the post form. */
  area: string;
  /** Pretend preference: ping the poster when a job is claimed. */
  notifyOnClaim: boolean;
  /** Force-reduce UI motion regardless of OS preference. */
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  area: "",
  notifyOnClaim: true,
  reduceMotion: false,
};

const SETTINGS_KEY = "jobtag:settings";

export async function loadSettings(): Promise<Settings> {
  const raw = await kvGet(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...v };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<boolean> {
  return kvSet(SETTINGS_KEY, JSON.stringify(settings));
}