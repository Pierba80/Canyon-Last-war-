import { useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Crown, Plus, Trash2, TriangleAlert, UserMinus, UserRoundX, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  STRUCTURES, STRUCTURE_BY_ID, cleanName, emptyAssignment, parseNames, placementLabel, suggestNames, teamTitle,
} from "@/lib/planner";
import type { NamePlacements, PlannerActions, TeamId, TeamPlan } from "@/lib/planner";

interface Props {
  team: TeamId;
  plan: TeamPlan;
  focusedId: string | null;
  onFocus: (id: string | null) => void;
  actions: PlannerActions;
  knownNames: string[];
  members: string[];
  unassigned: string[];
  /** Every name already on a visible building (either team) — used to offer importing them as members. */
  usedNames: string[];
  placements: Map<string, NamePlacements>;
  duplicates: NamePlacements[];
}

export default function AssignmentPanel(props: Props) {
  const { team, plan, focusedId, onFocus, actions, knownNames, unassigned, placements } = props;
  if (focusedId && STRUCTURE_BY_ID[focusedId]) {
    return (
      <Editor key={`${team}-${focusedId}`} team={team} plan={plan} id={focusedId} onFocus={onFocus} actions={actions} knownNames={knownNames} unassigned={unassigned} placements={placements} />
    );
  }
  return <Roster {...props} />;
}

function Roster({ team, plan, onFocus, actions, members, unassigned, usedNames, duplicates }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
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
        <DoubleBooked duplicates={duplicates} team={team} onFocus={onFocus} actions={actions} />
        <MembersSummary members={members} unassigned={unassigned} onManage={() => setMembersOpen(true)} />
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
      <MembersDialog
        key={membersOpen ? "open" : "closed"}
        open={membersOpen}
        onOpenChange={setMembersOpen}
        members={members}
        usedNames={usedNames}
        onSave={(list) => {
          actions.setMembers(list);
          setMembersOpen(false);
          toast.success(`Alliance list saved (${list.length} members)`);
        }}
      />
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

function DoubleBooked({ duplicates, team, onFocus, actions }: { duplicates: NamePlacements[]; team: TeamId; onFocus: (id: string | null) => void; actions: PlannerActions }) {
  if (!duplicates.length) return null;
  return (
    <section data-testid="double-booked-section" className="mb-3 rounded-md border border-[#FF3B62]/40 bg-[#FF3B62]/[0.07] p-3">
      <div className="flex items-center gap-2">
        <TriangleAlert className="size-4 text-[#FF6B8B]" />
        <p className="flex-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#FF8BA4]">Double-booked</p>
        <span data-testid="double-booked-count" className="font-heading text-sm font-bold text-[#FF6B8B]">{duplicates.length}</span>
      </div>
      <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
        {duplicates.map((d) => (
          <li key={d.name} data-testid={`double-booked-${slug(d.name)}`}>
            <p className="text-sm font-semibold text-[#FFD1DA]">{d.name}</p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {d.placements.map((p, i) => (
                <button
                  key={`${p.team}-${p.id}-${i}`}
                  type="button"
                  data-testid={`double-booked-goto-${slug(d.name)}-${i}`}
                  disabled={p.team !== team}
                  title={p.team !== team ? `Switch to Team ${p.team} to edit` : "Open this building"}
                  onClick={() => {
                    actions.select(team, p.id);
                    onFocus(p.id);
                  }}
                  className="rounded-sm border border-[#FF3B62]/30 px-1.5 py-0.5 text-[11px] text-[#FFB3C1] transition-colors duration-150 enabled:hover:border-[#FF6B8B] enabled:hover:text-white disabled:opacity-60"
                >
                  {placementLabel(p)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Inline warning under a name that is also placed elsewhere. */
function DupNote({ name, placements, team, id, testId }: { name: string; placements: Map<string, NamePlacements>; team: TeamId; id: string; testId: string }) {
  const entry = placements.get(cleanName(name).toLowerCase());
  if (!entry || entry.placements.length < 2) return null;
  let skipped = false;
  const others = entry.placements.filter((p) => {
    if (!skipped && p.team === team && p.id === id) {
      skipped = true;
      return false;
    }
    return true;
  });
  return (
    <p data-testid={testId} className="flex basis-full items-start gap-1 pl-7 text-[11px] text-[#FF8BA4]">
      <TriangleAlert className="mt-px size-3 shrink-0" /> Also on {others.map(placementLabel).join(", ")}
    </p>
  );
}

function MembersSummary({ members, unassigned, onManage }: { members: string[]; unassigned: string[]; onManage: () => void }) {
  const done = members.length > 0 && unassigned.length === 0;
  return (
    <section data-testid="unassigned-section" className="mb-3 rounded-md border border-[#00E5FF]/20 bg-[#060A12]/60 p-3">
      <div className="flex items-center gap-2">
        <UserRoundX className={`size-4 ${unassigned.length ? "text-amber-300" : "text-[#00F5A0]"}`} />
        <p className="flex-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7DD3FC]">Unassigned members</p>
        <span data-testid="unassigned-count" className={`font-heading text-sm font-bold ${unassigned.length ? "text-amber-300" : "text-[#00F5A0]"}`}>
          {members.length ? `${unassigned.length}/${members.length}` : "—"}
        </span>
      </div>
      {members.length === 0 ? (
        <p className="mt-2 text-xs text-[#8EA7C7]">Add your alliance member list to see who isn't on a building yet in either team.</p>
      ) : done ? (
        <p data-testid="all-assigned-msg" className="mt-2 text-xs text-[#00F5A0]">Everyone is deployed across Team A and Team B.</p>
      ) : (
        <ul data-testid="unassigned-list" className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {unassigned.map((n) => (
            <li key={n} data-testid={`unassigned-member-${slug(n)}`} className="rounded-sm border border-amber-300/30 bg-amber-300/[0.07] px-2 py-0.5 text-xs text-amber-100">
              {n}
            </li>
          ))}
        </ul>
      )}
      <Button variant="ghost" size="sm" data-testid="manage-members-btn" onClick={onManage} className="mt-2 h-8 px-2 text-xs text-[#38F8FF] hover:bg-[#00E5FF]/10">
        <Users className="size-3.5" /> {members.length ? "Edit member list" : "Add member list"}
      </Button>
    </section>
  );
}

function MembersDialog({ open, onOpenChange, members, usedNames, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; members: string[]; usedNames: string[]; onSave: (list: string[]) => void;
}) {
  const [text, setText] = useState(members.join("\n"));
  const count = parseNames(text).length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="members-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">Alliance members</DialogTitle>
          <DialogDescription>Paste one name per line, or separate names with commas. Shared by Team A and Team B.</DialogDescription>
        </DialogHeader>
        <Textarea
          data-testid="members-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Commander Rex\nNova\nBlaze"}
          className="min-h-48 bg-[#071B33]/70 font-sans text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <span data-testid="members-count" className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7B96B8]">{count} names</span>
          <Button
            variant="ghost"
            size="sm"
            data-testid="import-used-names-btn"
            disabled={usedNames.length === 0}
            onClick={() => setText(parseNames(`${text}\n${usedNames.join("\n")}`).join("\n"))}
            className="text-xs text-[#38F8FF] hover:bg-[#00E5FF]/10"
          >
            <Plus className="size-3.5" /> Add names already on the map
          </Button>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" data-testid="members-cancel-btn" />}>Cancel</DialogClose>
          <Button data-testid="members-save-btn" onClick={() => onSave(parseNames(text))}>Save list</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-md border border-[#00E5FF]/15 bg-[#060A12]/60 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#7B96B8]">{label}</p>
      <p data-testid={testId} className="font-heading text-lg font-bold text-[#38F8FF]">{value}</p>
    </div>
  );
}

function Editor({ team, plan, id, onFocus, actions, knownNames, unassigned, placements }: Pick<Props, "team" | "plan" | "onFocus" | "actions" | "knownNames" | "unassigned" | "placements"> & { id: string }) {
  const def = STRUCTURE_BY_ID[id];
  const a = plan.assignments[id] ?? emptyAssignment();
  const selected = plan.selected.includes(id);
  const [draft, setDraft] = useState("");
  const [leaderFocus, setLeaderFocus] = useState(false);
  const [playerFocus, setPlayerFocus] = useState(false);
  const playerRef = useRef<HTMLInputElement>(null);

  const segments = draft.split(",");
  const pending = segments.slice(0, -1).map(cleanName).filter(Boolean);
  const leaderHits = leaderFocus ? suggestNames(knownNames, a.leader, [a.leader, ...a.players]) : [];
  const playerHits = playerFocus
    ? suggestNames(knownNames, segments[segments.length - 1], [a.leader, ...a.players, ...pending])
    : [];

  const addNames = (names: string[]) => {
    if (!names.length) return;
    if (!selected) actions.select(team, id);
    names.forEach((n) => actions.addPlayer(team, id, n));
    setDraft("");
    warnIfPlaced(names);
  };
  const warnIfPlaced = (names: string[]) => {
    for (const n of names) {
      const e = placements.get(n.toLowerCase());
      if (e?.placements.length) toast.warning(`${e.name} is already on ${e.placements.map(placementLabel).join(", ")}`);
    }
  };
  const add = () => addNames(draft.split(",").map(cleanName).filter(Boolean));

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
            autoComplete="off"
            onFocus={() => setLeaderFocus(true)}
            onBlur={() => setLeaderFocus(false)}
            onChange={(e) => {
              if (!selected) actions.select(team, id);
              actions.setLeader(team, id, e.target.value);
            }}
            className="h-11 border-[#38F8FF]/40 bg-[#002D54]/50 font-heading text-base font-semibold text-[#38F8FF] placeholder:text-[#5B7A9C]"
          />
          <Suggestions
            testId="leader-suggestions"
            names={leaderHits}
            onPick={(n) => {
              if (!selected) actions.select(team, id);
              actions.setLeader(team, id, n);
              setLeaderFocus(false);
              warnIfPlaced([n]);
            }}
          />
          <div className="flex flex-wrap">
            <DupNote name={a.leader} placements={placements} team={team} id={id} testId="leader-dup-warning" />
          </div>
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
              ref={playerRef}
              value={draft}
              autoComplete="off"
              onFocus={() => setPlayerFocus(true)}
              onBlur={() => setPlayerFocus(false)}
              onChange={(e) => setDraft(e.target.value)}
              className="h-11 bg-[#071B33]/70"
            />
            <Button type="submit" data-testid="add-player-btn" className="h-11 px-4" disabled={!draft.trim()}>
              <Plus className="size-4" /> Add
            </Button>
          </form>
          <Suggestions
            testId="player-suggestions"
            names={playerHits}
            onPick={(n) => {
              addNames([...pending, n]);
              playerRef.current?.focus();
            }}
          />
          {!draft.trim() && unassigned.length > 0 && (
            <Suggestions
              testId="unassigned-suggestions"
              label="Unassigned"
              names={unassigned.slice(0, 12)}
              onPick={(n) => addNames([n])}
            />
          )}
          <ul className="space-y-1.5 pt-1" data-testid="player-list">
            {a.players.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="w-5 text-right font-mono text-[10px] text-[#5B7A9C]">{String(i + 1).padStart(2, "0")}</span>
                <Input
                  data-testid={`player-edit-input-${i}`}
                  aria-label={`Player ${i + 1}`}
                  value={p}
                  onChange={(e) => actions.updatePlayer(team, id, i, e.target.value)}
                  className="h-10 w-auto min-w-0 flex-1 bg-[#071B33]/70"
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
                <DupNote name={p} placements={placements} team={team} id={id} testId={`player-dup-warning-${i}`} />
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

/** Tappable chips of previously used alliance names. mousedown is cancelled so the input keeps focus. */
function Suggestions({ names, onPick, testId, label = "Used before" }: { names: string[]; onPick: (n: string) => void; testId: string; label?: string }) {
  if (!names.length) return null;
  return (
    <div data-testid={testId} className="flex flex-wrap items-center gap-1.5 pt-0.5" onMouseDown={(e) => e.preventDefault()}>
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#5B7A9C]">{label}</span>
      {names.map((n) => (
        <button
          key={n}
          type="button"
          data-testid={`${testId}-item-${slug(n)}`}
          onClick={() => onPick(n)}
          className="min-h-8 rounded-sm border border-[#38F8FF]/35 bg-[#002D54]/60 px-2.5 text-xs font-medium text-[#9FE8FF] transition-[background-color,border-color,color] duration-150 ease-out hover:border-[#38F8FF] hover:bg-[#003A66] hover:text-white"
        >
          {n}
        </button>
      ))}
    </div>
  );
}
