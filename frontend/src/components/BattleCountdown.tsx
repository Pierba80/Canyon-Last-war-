import { useState } from "react";
import { CalendarClock, Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { battleStatus, formatBattleTime, formatCountdown, useNow } from "@/lib/battle";
import type { BattleSchedule } from "@/lib/planner";

interface Props {
  battle: BattleSchedule;
  onChange: (b: BattleSchedule) => void;
}

/** Countdown chip shown at the top of each team's map; click to set the shared battle time. */
export default function BattleCountdown({ battle, onChange }: Props) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const st = battleStatus(battle, now);

  let label: string;
  let value: string;
  let tone = "border-[#00E5FF]/35 text-[#38F8FF]";
  if (!st) {
    label = "Next battle";
    value = "Set time";
  } else if (st.live) {
    label = "Battle live";
    value = formatCountdown(st.start.getTime() + 60 * 60 * 1000 - now);
    tone = "border-[#FF3B62]/60 text-[#FF6B8B] live-glow";
  } else if (st.soon) {
    label = "Starting soon";
    value = formatCountdown(st.start.getTime() - now);
    tone = "border-amber-300/70 text-amber-200 soon-glow";
  } else if (st.ended) {
    label = "Battle ended";
    value = formatBattleTime(st.start);
    tone = "border-[#5B7A9C]/40 text-[#8EA7C7]";
  } else {
    label = "Next battle";
    value = formatCountdown(st.start.getTime() - now);
  }

  return (
    <>
      <button
        type="button"
        data-testid="battle-countdown"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2.5 rounded-md border bg-[#050D1A]/80 px-3 py-1.5 text-left backdrop-blur-md transition-[border-color,background-color] duration-200 hover:bg-[#0B1A30] ${tone}`}
      >
        {st?.live ? <Swords className="size-5 shrink-0" /> : <CalendarClock className="size-5 shrink-0" />}
        <span className="leading-tight">
          <span className="block font-mono text-[9px] uppercase tracking-[0.22em] opacity-80">{label}</span>
          <span data-testid="battle-countdown-value" className="block font-mono text-base font-semibold tabular-nums sm:text-lg">{value}</span>
          {st && !st.ended && (
            <span data-testid="battle-countdown-when" className="block text-[10px] text-[#8EA7C7]">
              {formatBattleTime(st.start)}
              {battle.weekly ? " · weekly" : ""}
            </span>
          )}
        </span>
      </button>
      <BattleDialog key={open ? "o" : "c"} open={open} onOpenChange={setOpen} battle={battle} onSave={(b) => { onChange(b); setOpen(false); }} />
    </>
  );
}

function BattleDialog({ open, onOpenChange, battle, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; battle: BattleSchedule; onSave: (b: BattleSchedule) => void;
}) {
  const [at, setAt] = useState(battle.at ?? "");
  const [weekly, setWeekly] = useState(battle.weekly);
  const parsed = at ? new Date(at) : null;
  const valid = parsed !== null && !Number.isNaN(parsed.getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="battle-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">Battle start time</DialogTitle>
          <DialogDescription>Shared by Team A and Team B. Uses this device's local time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="battle-at" className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7DD3FC]">Date & time</Label>
          <Input
            id="battle-at"
            type="datetime-local"
            data-testid="battle-datetime-input"
            value={at}
            onChange={(e) => setAt(e.target.value)}
            className="h-11 bg-[#071B33]/70 [color-scheme:dark]"
          />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-[#00E5FF]/20 px-3">
          <Checkbox data-testid="battle-weekly-checkbox" checked={weekly} onCheckedChange={(c) => setWeekly(c === true)} />
          <span className="text-sm">
            Repeat weekly
            {valid && weekly && (
              <span className="block text-xs text-[#8EA7C7]">
                Every {parsed.toLocaleDateString([], { weekday: "long" })} at {parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </span>
        </label>
        <DialogFooter className="gap-2">
          {battle.at && (
            <Button
              variant="ghost"
              data-testid="battle-clear-btn"
              className="mr-auto text-[#FF6B8B] hover:bg-[#FF3B62]/10"
              onClick={() => {
                onSave({ at: null, weekly: false });
                toast("Battle time cleared");
              }}
            >
              Clear
            </Button>
          )}
          <DialogClose render={<Button variant="outline" data-testid="battle-cancel-btn" />}>Cancel</DialogClose>
          <Button
            data-testid="battle-save-btn"
            disabled={!valid}
            onClick={() => {
              onSave({ at, weekly });
              toast.success("Battle time saved");
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
