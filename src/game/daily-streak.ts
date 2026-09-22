export const DAILY_STREAK_CAP = 7;

function dayNumber(stamp: string | undefined): number | null {
  if (!stamp) return null;
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(stamp);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = Date.UTC(year, month - 1, day);
  return Number.isFinite(value) ? Math.floor(value / 86_400_000) : null;
}

export function nextDailyStreak(lastClaimed: string | undefined, currentStreak: number, today: string): number {
  const previous = dayNumber(lastClaimed);
  const current = dayNumber(today);
  if (previous === null || current === null || current - previous !== 1) return 1;
  return Math.min(DAILY_STREAK_CAP, Math.max(1, Math.floor(currentStreak)) + 1);
}

export function dailyStreakBonus(streak: number): number {
  return Math.min(DAILY_STREAK_CAP, Math.max(1, Math.floor(streak))) * 2;
}
