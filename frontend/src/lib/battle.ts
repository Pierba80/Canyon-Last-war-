import { useEffect, useState } from "react";
import type { BattleSchedule } from "@/lib/planner";

/** How long a battle shows as "LIVE" after it starts. */
export const LIVE_MS = 60 * 60 * 1000;

export interface BattleStatus {
  start: Date;
  live: boolean;
  ended: boolean; // one-off battle fully past
}

/**
 * Next relevant battle start from the user's local schedule. Weekly schedules roll forward with
 * calendar weeks (setDate) so the wall-clock time stays fixed across DST changes.
 */
export function battleStatus(b: BattleSchedule, now: number): BattleStatus | null {
  if (!b.at) return null;
  const start = new Date(b.at);
  if (Number.isNaN(start.getTime())) return null;
  if (b.weekly) {
    while (now >= start.getTime() + LIVE_MS) start.setDate(start.getDate() + 7);
  }
  const t = start.getTime();
  return { start, live: now >= t && now < t + LIVE_MS, ended: !b.weekly && now >= t + LIVE_MS };
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return d > 0 ? `${d}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

export function formatBattleTime(start: Date): string {
  return start.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** One-line label for exports/print, e.g. "Sat 18 Oct, 20:00 · every Saturday". */
export function battleLabel(b: BattleSchedule, now = Date.now()): string | null {
  const st = battleStatus(b, now);
  if (!st) return null;
  const when = formatBattleTime(st.start);
  if (b.weekly) return `${when} · every ${st.start.toLocaleDateString([], { weekday: "long" })}`;
  return when;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
