import { useState } from "react";
import { ArrowLeft, Check, ChevronRight, Crown, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { STRUCTURES, STRUCTURE_BY_ID, cleanName, emptyAssignment, teamTitle } from "@/lib/planner";
import type { PlannerActions, TeamId, TeamPlan } from "@/lib/planner";

interface Props {
  team: TeamId;
  plan: TeamPlan;
  focusedId: string | null;
  onFocus: (id: string | null) => void;
  actions: PlannerActions;
}

export default function AssignmentPanel({ team, plan, focusedId, onFocus, actions }: Props) {
  if (focusedId && STRUCTURE_BY_ID[focusedId]) {
    return <Editor key={`${team}-${focusedId}`} team={team} plan={plan} id={focusedId} onFocus={onFocus} actions={actions} />;
  }
  return <Roster team={team} plan={plan} onFocus={onFocus} actions={actions} />;
}

function Roster({ team, plan, onFocus, actions }: Omit<Props, "focusedId">) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const operatives = plan.selected.reduce((n, id) => {
    const a = plan.assignments[id];
    return n + (a ? a.players.filter((p) => p.trim()).length + (a.leader.trim() ? 1 : 0) : 0);
  }, 0);

  return (
    <div className="flex h-full flex-col" data-testid="roster-panel">
      <div className="border-b border-[#00E5FF]/15 px-5 pb-4 pt-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#7DD3FC]">Assignment console</p>
        <h2 className="mt-1 font-heading text-xl font-bold tracking-tight text-white">{teamTitle(team)}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Structures" value={`${plan.selected.length}/${STRUCTURES.length}`} testId="stat-structures" />
          <Stat label="Operatives" value={String(operatives)} testId="stat-operatives" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="px-2 pb-2 text-xs text-[#8EA7C7]">Tap a structure on the map or below to deploy a squad.</p>
        <ul className="space-y-1">
          {STRUCTURES.map((s) => {
            const sel = plan.selected.includes(s.id);
            const a = plan.assignments[s.id];
            const count = a ? a.players.filter((p) => p.trim()).length : 0;
            return (
              <li key={s.id} className={`flex items-center gap-1 rounded-md border transition-colors duration-200 ${sel ? "border-[#00E5FF]/35 bg-[#00E5FF]/[0.06]" : "border-transparent hover:bg-white/[0.03]"}`}>
                <button
                  type="button"
                  data-testid={`toggle-structure-${s.id}`}
                  aria-label={sel ? `Hide ${s.name}` : `Select ${s.name}`}
                  aria-pressed={sel}
                  onClick={() => (sel ? actions.deselect(team, s.id) : actions.select(team, s.id))}
                  className={`ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-sm border transition-[background-color,border-color] duration-200 ${sel ? "border-[#00E5FF] bg-[#00E5FF] text-[#031422]" : "border-[#00E5FF]/30 text-transparent hover:border-[#00E5FF]/70"}`}
                >
                  <Check className="size-4" />
                </button>
                <button
                  type="button"
                  data-testid={`open-structure-${s.id}`}
                  onClick={() => {
                    actions.select(team, s.id);
                    onFocus(s.id);
                  }}
                  className="flex min-h-11 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#E2F1FF]">{s.name}</span>
                    <span className="block truncate text-xs text-[#7B96B8]">
                      {a?.leader.trim() ? `★ ${a.leader.trim()}` : sel ? "No leader yet" : "Not deployed"}
                    </span>
                  </span>
                  {count > 0 && (
                    <span className="flex items-center gap-1 rounded-sm bg-[#002D54] px-1.5 py-0.5 font-mono text-[10px] text-[#38F8FF]">
                      <Users className="size-3" /> {count}
                    </span>
                  )}
                  <ChevronRight className="size-4 text-[#7B96B8]" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t border-[#00E5FF]/15 p-3">
        <Button
          variant="ghost"
          data-testid="clear-team-btn"
          className="w-full text-[#FF6B8B] hover:bg-[#FF3B62]/10 hover:text-[#FF8BA4]"
          onClick={() => setConfirmOpen(true)}
          disabled={plan.selected.length === 0 && Object.keys(plan.assignments).length === 0}
        >
          <Trash2 className="size-4" /> Clear {teamTitle(team)} plan
        </Button>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent data-testid="clear-team-dialog">
          <DialogHeader>
            <DialogTitle>Clear {teamTitle(team)}?</DialogTitle>
            <DialogDescription>All selected structures and squad assignments for this team will be removed. The other team is not affected.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" data-testid="clear-team-cancel" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              data-testid="clear-team-confirm"
              onClick={() => {
                actions.clearTeam(team);
                setConfirmOpen(false);
                toast.success(`${teamTitle(team)} plan cleared`);
              }}
            >
              Clear plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-md border border-[#00E5FF]/15 bg-[#060A12]/60 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#7B96B8]">{label}</p>
      <p data-testid={testId} className="font-heading text-lg font-bold text-[#38F8FF]">{value}</p>
    </div>
  );
}

function Editor({ team, plan, id, onFocus, actions }: Omit<Props, "focusedId"> & { id: string }) {
  const def = STRUCTURE_BY_ID[id];
  const a = plan.assignments[id] ?? emptyAssignment();
  const selected = plan.selected.includes(id);
  const [draft, setDraft] = useState("");

  const add = () => {
    const names = draft.split(",").map(cleanName).filter(Boolean);
    if (!names.length) return;
    if (!selected) actions.select(team, id);
    names.forEach((n) => actions.addPlayer(team, id, n));
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col" data-testid="assignment-editor">
      <div className="border-b border-[#00E5FF]/15 px-5 pb-4 pt-4">
        <button
          type="button"
          data-testid="panel-back-button"
          onClick={() => onFocus(null)}
          className="-ml-1 flex items-center gap-1 rounded-sm px-1 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7DD3FC] transition-colors duration-200 hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> All structures
        </button>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#7B96B8]">{teamTitle(team)}</p>
        <h2 data-testid="editor-structure-name" className="font-heading text-2xl font-bold tracking-tight text-white">{def.name}</h2>
        {!selected && (
          <p className="mt-1 text-xs text-amber-300">Hidden from map — add a name or re-select to show it.</p>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <div className="space-y-2">
          <Label htmlFor="leader-input" className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7DD3FC]">
            <Crown className="size-3.5" /> Squad leader
          </Label>
          <Input
            id="leader-input"
            data-testid="leader-input"
            placeholder="Leader name"
            value={a.leader}
            onChange={(e) => {
              if (!selected) actions.select(team, id);
              actions.setLeader(team, id, e.target.value);
            }}
            className="h-11 border-[#38F8FF]/40 bg-[#002D54]/50 font-heading text-base font-semibold text-[#38F8FF] placeholder:text-[#5B7A9C]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="player-input" className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7DD3FC]">
            <Users className="size-3.5" /> Allied players ({a.players.length})
          </Label>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <Input
              id="player-input"
              data-testid="player-input"
              placeholder="Name (comma for several)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-11 bg-[#071B33]/70"
            />
            <Button type="submit" data-testid="add-player-btn" className="h-11 px-4" disabled={!draft.trim()}>
              <Plus className="size-4" /> Add
            </Button>
          </form>
          <ul className="space-y-1.5 pt-1" data-testid="player-list">
            {a.players.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 text-right font-mono text-[10px] text-[#5B7A9C]">{String(i + 1).padStart(2, "0")}</span>
                <Input
                  data-testid={`player-edit-input-${i}`}
                  aria-label={`Player ${i + 1}`}
                  value={p}
                  onChange={(e) => actions.updatePlayer(team, id, i, e.target.value)}
                  className="h-10 bg-[#071B33]/70"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`remove-player-btn-${i}`}
                  aria-label={`Remove ${p}`}
                  onClick={() => actions.removePlayer(team, id, i)}
                  className="size-10 text-[#7B96B8] hover:bg-[#FF3B62]/10 hover:text-[#FF6B8B]"
                >
                  <UserMinus className="size-4" />
                </Button>
              </li>
            ))}
            {a.players.length === 0 && (
              <li className="rounded-md border border-dashed border-[#00E5FF]/20 px-3 py-4 text-center text-xs text-[#7B96B8]">
                No allied players yet.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="flex gap-2 border-t border-[#00E5FF]/15 p-3">
        <Button
          variant="ghost"
          data-testid="remove-structure-btn"
          className="flex-1 text-[#FF6B8B] hover:bg-[#FF3B62]/10 hover:text-[#FF8BA4]"
          onClick={() => {
            actions.removeStructure(team, id);
            onFocus(null);
            toast(`${def.name} removed from ${teamTitle(team)}`);
          }}
        >
          <Trash2 className="size-4" /> Remove
        </Button>
        <Button data-testid="done-btn" className="flex-1" onClick={() => onFocus(null)}>
          <Check className="size-4" /> Done
        </Button>
      </div>
    </div>
  );
}
