import { useEffect, useRef, useState } from "react";
import { AlarmClock, X } from "lucide-react";
import { toast } from "sonner";
import { battleStatus, formatBattleTime, formatCountdown, useNow } from "@/lib/battle";
import type { BattleSchedule } from "@/lib/planner";

const DISMISS_KEY = "canyon_tactical_planner_reminder_dismissed_v1";

/** On-screen banner shown during the 15 minutes before the battle starts. Dismissal is per occurrence. */
export default function BattleReminder({ battle }: { battle: BattleSchedule }) {
  const now = useNow();
  const st = battleStatus(battle, now);
  const startTs = st?.start.getTime() ?? null;
  const [dismissed, setDismissed] = useState<number | null>(() => {
    const v = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  });
  const notified = useRef<number | null>(null);
  const soon = !!st?.soon;

  // One pop-up when the reminder window opens for this occurrence.
  useEffect(() => {
    if (soon && startTs !== null && notified.current !== startTs) {
      notified.current = startTs;
      toast.warning("Battle starts in less than 15 minutes — get squads into position!", { duration: 8000 });
    }
  }, [soon, startTs]);

  if (!st || !soon || startTs === null || dismissed === startTs) return null;

  return (
    <div
      role="alert"
      data-testid="battle-reminder"
      className="reminder-in soon-glow mx-2 mb-2 flex items-center gap-3 rounded-md border border-amber-300/60 bg-gradient-to-r from-amber-400/20 via-amber-300/10 to-transparent px-3 py-2.5 sm:mx-4"
    >
      <AlarmClock className="size-6 shrink-0 text-amber-300 hud-pulse" />
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-bold uppercase tracking-wide text-amber-100 sm:text-base">
          Battle starts in <span data-testid="battle-reminder-countdown" className="font-mono tabular-nums text-amber-300">{formatCountdown(startTs - now)}</span>
        </p>
        <p className="truncate text-xs text-amber-200/80">
          {formatBattleTime(st.start)} · Both teams: confirm leaders and get squads into position.
        </p>
      </div>
      <button
        type="button"
        data-testid="battle-reminder-dismiss"
        aria-label="Dismiss reminder"
        onClick={() => {
          setDismissed(startTs);
          try {
            localStorage.setItem(DISMISS_KEY, String(startTs));
          } catch {
            /* ignore */
          }
        }}
        className="flex size-10 shrink-0 items-center justify-center rounded-sm text-amber-200 transition-colors duration-150 hover:bg-amber-300/15 hover:text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
