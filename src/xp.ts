export const XP_POST = 10;
export const XP_COMPLETE = 25;

interface LevelDef {
  level: number;
  title: string;
  min: number;
}

const LEVELS: LevelDef[] = [
  { level: 1, title: "Rookie", min: 0 },
  { level: 2, title: "Helper", min: 60 },
  { level: 3, title: "Handy", min: 150 },
  { level: 4, title: "Tasker", min: 300 },
  { level: 5, title: "Pro", min: 500 },
  { level: 6, title: "Legend", min: 800 },
];

export interface LevelInfo {
  level: number;
  title: string;
  min: number;
  nextMin: number | null;
  nextTitle: string | null;
  /** 0..1 progress toward the next level. */
  progress: number;
}

export function levelInfo(xp: number): LevelInfo {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.min) current = l;
  }
  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  const progress = next ? Math.min(1, (xp - current.min) / (next.min - current.min)) : 1;
  return {
    level: current.level,
    title: current.title,
    min: current.min,
    nextMin: next?.min ?? null,
    nextTitle: next?.title ?? null,
    progress,
  };
}