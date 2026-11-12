import { Eye, EyeOff, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ROUTES, ROUTE_GROUPS, STRUCTURE_BY_ID, isRouteVisible, teamTitle } from "@/lib/planner";
import type { PlannerActions, TeamId } from "@/lib/planner";

interface Props {
  team: TeamId;
  visibility: Record<string, boolean>;
  actions: PlannerActions;
}

function Switch({ on, onChange, testId, label }: { on: boolean; onChange: (v: boolean) => void; testId: string; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-testid={testId}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-[background-color,border-color] duration-200 ${on ? "border-[#00E5FF] bg-[#00E5FF]/80" : "border-[#00E5FF]/30 bg-[#071B33]"}`}
    >
      <span className={`absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow transition-[left] duration-200 ${on ? "left-[18px]" : "left-[2px]"}`} />
    </button>
  );
}

/** Header "movement lines" button + popover with route visibility controls for the current team. */
export default function RouteControls({ team, visibility, actions }: Props) {
  const visibleCount = ROUTES.filter((r) => isRouteVisible(visibility, r.id)).length;
  const allIds = ROUTES.map((r) => r.id);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            data-testid="toggle-arrows-btn"
            aria-label="Tactical routes"
            title="Tactical routes"
            className={`h-9 gap-1.5 px-2.5 transition-colors duration-200 ${visibleCount ? "bg-[#00E5FF]/15 text-[#38F8FF]" : "text-[#B9D4F0] hover:bg-[#00E5FF]/10 hover:text-white"}`}
          />
        }
      >
        <Route className="size-4" />
        <span className="hidden xl:inline">Routes</span>
        <span data-testid="routes-visible-count" className="font-mono text-[10px]">{visibleCount}/{ROUTES.length}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] max-w-[calc(100vw-1rem)] gap-0 p-0" data-testid="routes-panel">
        <div className="border-b border-[#00E5FF]/15 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7DD3FC]">Tactical routes · saved per team</p>
          <p className="font-heading text-base font-bold text-white">{teamTitle(team)}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button size="sm" data-testid="routes-show-all" onClick={() => actions.setRoutes(team, allIds, true)}>
              <Eye className="size-3.5" /> Show all routes
            </Button>
            <Button size="sm" variant="outline" data-testid="routes-hide-all" onClick={() => actions.setRoutes(team, allIds, false)}>
              <EyeOff className="size-3.5" /> Hide all routes
            </Button>
          </div>
        </div>
        <div className="max-h-[60dvh] overflow-y-auto px-2 py-2">
          {ROUTE_GROUPS.map((g) => {
            const routes = ROUTES.filter((r) => r.group === g.id);
            const ids = routes.map((r) => r.id);
            const on = routes.filter((r) => isRouteVisible(visibility, r.id)).length;
            return (
              <section key={g.id} className="mb-2 rounded-md border border-[#00E5FF]/12 bg-[#060A12]/50">
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <span className="size-2.5 rounded-full" style={{ background: g.color, boxShadow: `0 0 6px ${g.color}` }} />
                  <p className="flex-1 text-sm font-semibold text-[#E2F1FF]">
                    {g.label} <span className="font-mono text-[10px] text-[#7B96B8]">{on}/{routes.length}</span>
                  </p>
                  <Switch
                    on={on > 0}
                    testId={`routes-group-${g.id}`}
                    label={`${on > 0 ? "Hide" : "Show"} ${g.label}`}
                    onChange={(v) => actions.setRoutes(team, ids, v)}
                  />
                </div>
                <ul className="border-t border-[#00E5FF]/10 py-1">
                  {routes.map((r) => {
                    const vis = isRouteVisible(visibility, r.id);
                    return (
                      <li key={r.id} className="flex min-h-9 items-center gap-2 px-2.5">
                        <svg width="22" height="8" aria-hidden="true" className="shrink-0">
                          <line x1="1" y1="4" x2="15" y2="4" stroke={r.color} strokeWidth="2" strokeDasharray="4 3" />
                          <polygon points="21,4 14,0.5 14,7.5" fill={r.color} />
                        </svg>
                        <span className={`flex-1 truncate text-xs ${vis ? "text-[#CFE6FF]" : "text-[#5B7A9C]"}`}>
                          {STRUCTURE_BY_ID[r.from]?.name} → {STRUCTURE_BY_ID[r.to]?.name}
                        </span>
                        <Switch on={vis} testId={`route-switch-${r.id}`} label={`Toggle ${r.id}`} onChange={(v) => actions.setRoutes(team, [r.id], v)} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
