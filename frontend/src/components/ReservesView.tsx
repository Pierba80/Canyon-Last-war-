import { useRef, useState } from "react";
import { ArrowRightToLine, Plus, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DupNote, Suggestions } from "@/components/AssignmentPanel";
import {
  RESERVES_ID, STRUCTURES, cleanName, placementLabel, suggestNames, teamTitle,
} from "@/lib/planner";
import type { NamePlacements, PlannerActions, TeamId, TeamPlan } from "@/lib/planner";

interface Props {
  team: TeamId;
  plan: TeamPlan;
  actions: PlannerActions;
  knownNames: string[];
  unassigned: string[];
  placements: Map<string, NamePlacements>;
}

/** Separate reserves screen for one team. */
export default function ReservesView({ team, plan, actions, knownNames, unassigned, placements }: Props) {
  const [draft, setDraft] = useState("");
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const segments = draft.split(",");
  const pending = segments.slice(0, -1).map(cleanName).filter(Boolean);
  const hits = focus ? suggestNames(knownNames, segments[segments.length - 1], [...plan.reserves, ...pending]) : [];

  const add = (names: string[]) => {
    const clean = names.map(cleanName).filter(Boolean);
    if (!clean.length) return;
    for (const n of clean) {
      const e = placements.get(n.toLowerCase());
      if (e?.placements.length) toast.warning(`${e.name} is already on ${e.placements.map(placementLabel).join(", ")}`);
    }
    actions.addReserves(team, clean);
    setDraft("");
  };

  return (
    <div data-testid={`reserves-view-${team.toLowerCase()}`} className="hud-grid h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#7DD3FC]">{teamTitle(team)}</p>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">Reserves</h2>
          </div>
          <span data-testid="reserves-count" className="rounded-sm border border-[#00E5FF]/30 bg-[#002D54]/60 px-2.5 py-1 font-mono text-sm text-[#38F8FF]">
            {plan.reserves.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-[#8EA7C7]">Standby players ready to step in. Use “Move to building” to deploy one onto the map.</p>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(draft.split(","));
          }}
        >
          <Input
            ref={inputRef}
            data-testid="reserve-input"
            placeholder="Reserve name (comma for several)"
            value={draft}
            autoComplete="off"
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onChange={(e) => setDraft(e.target.value)}
            className="h-11 bg-[#071B33]/70"
          />
          <Button type="submit" data-testid="add-reserve-btn" className="h-11 px-4" disabled={!draft.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </form>
        <div className="mt-2 space-y-2">
          <Suggestions testId="reserve-suggestions" names={hits} onPick={(n) => { add([...pending, n]); inputRef.current?.focus(); }} />
          {!draft.trim() && unassigned.length > 0 && (
            <Suggestions testId="reserve-unassigned" label="Unassigned" names={unassigned.slice(0, 16)} onPick={(n) => add([n])} />
          )}
        </div>

        <ul data-testid="reserve-list" className="mt-5 space-y-2">
          {plan.reserves.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-[#00E5FF]/15 bg-[#0B1322]/90 p-2">
              <span className="w-6 text-right font-mono text-[10px] text-[#5B7A9C]">R{String(i + 1).padStart(2, "0")}</span>
              <Input
                data-testid={`reserve-edit-input-${i}`}
                aria-label={`Reserve ${i + 1}`}
                value={r}
                onChange={(e) => actions.updateReserve(team, i, e.target.value)}
                className="h-10 w-auto min-w-0 flex-1 bg-[#071B33]/70"
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" data-testid={`promote-reserve-btn-${i}`} className="h-10 gap-1.5 px-2.5 text-[#38F8FF] hover:bg-[#00E5FF]/10" />}
                  disabled={!cleanName(r)}
                >
                  <ArrowRightToLine className="size-4" /> <span className="hidden sm:inline">Move to building</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72">
                  <DropdownMenuGroup>
                  <DropdownMenuLabel>Deploy {cleanName(r)} to…</DropdownMenuLabel>
                  {STRUCTURES.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      data-testid={`promote-reserve-${i}-to-${s.id}`}
                      onClick={() => {
                        actions.promoteReserve(team, i, s.id);
                        toast.success(`${cleanName(r)} moved to ${s.name}`);
                      }}
                    >
                      {s.name}
                    </DropdownMenuItem>
                  ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`remove-reserve-btn-${i}`}
                aria-label={`Remove ${r}`}
                onClick={() => actions.removeReserve(team, i)}
                className="size-10 text-[#7B96B8] hover:bg-[#FF3B62]/10 hover:text-[#FF6B8B]"
              >
                <UserMinus className="size-4" />
              </Button>
              <DupNote name={r} placements={placements} team={team} id={RESERVES_ID} testId={`reserve-dup-warning-${i}`} />
            </li>
          ))}
          {plan.reserves.length === 0 && (
            <li className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[#00E5FF]/25 px-4 py-10 text-center text-sm text-[#7B96B8]">
              <Users className="size-6 text-[#00E5FF]/60" />
              No reserves for {teamTitle(team)} yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
