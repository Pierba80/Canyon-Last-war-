import { STRUCTURES, cleanName, teamTitle } from "@/lib/planner";
import type { NamePlacements, TeamId, TeamPlan } from "@/lib/planner";

interface Props {
  teams: TeamId[];
  plans: Record<TeamId, TeamPlan>;
  placements: Map<string, NamePlacements>;
  battle: string | null;
}

/** Print-only roster sheet (hidden on screen). One page per team, every building listed. */
export default function PrintRoster({ teams, plans, placements, battle }: Props) {
  const isDup = (n: string) => (placements.get(cleanName(n).toLowerCase())?.placements.length ?? 0) > 1;
  const date = new Date().toLocaleString();

  return (
    <div data-testid="print-roster" className="print-roster hidden print:block">
      {teams.map((t) => {
        const plan = plans[t];
        let operatives = 0;
        let hasDup = false;
        const rows = STRUCTURES.map((s) => {
          const deployed = plan.selected.includes(s.id);
          const a = plan.assignments[s.id];
          const leader = deployed ? cleanName(a?.leader ?? "") : "";
          const players = deployed ? (a?.players ?? []).map(cleanName).filter(Boolean) : [];
          operatives += players.length + (leader ? 1 : 0);
          if ([leader, ...players].some((n) => n && isDup(n))) hasDup = true;
          return { s, deployed, leader, players };
        });
        return (
          <section key={t} data-testid={`print-roster-team-${t.toLowerCase()}`} className="print-page">
            <header className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
              <div>
                <p className="text-[9pt] uppercase tracking-[0.25em] text-neutral-600">Tactical roster sheet</p>
                <h1 className="font-heading text-[24pt] font-black uppercase leading-none tracking-tight">{teamTitle(t)}</h1>
              </div>
              <div className="text-right text-[9pt] text-neutral-700">
                {battle && <p data-testid="print-battle" className="text-[11pt] font-semibold text-black">Battle: {battle}</p>}
                <p>{plan.selected.length} of {STRUCTURES.length} buildings deployed · {operatives} operatives</p>
                <p>{date}</p>
              </div>
            </header>
            <table className="w-full border-collapse text-[10pt]">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="w-[26%] py-1.5 pr-2">Building</th>
                  <th className="w-[22%] py-1.5 pr-2">Squad leader</th>
                  <th className="py-1.5 pr-2">Allied players</th>
                  <th className="w-[6%] py-1.5 text-right">#</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, deployed, leader, players }) => (
                  <tr key={s.id} className="break-inside-avoid border-b border-neutral-300 align-top">
                    <td className={`py-1.5 pr-2 font-semibold ${deployed ? "" : "text-neutral-400"}`}>{s.name}</td>
                    {deployed ? (
                      <>
                        <td className="py-1.5 pr-2">{leader ? <Name n={leader} dup={isDup(leader)} /> : <span className="text-neutral-400">—</span>}</td>
                        <td className="py-1.5 pr-2">
                          {players.length ? (
                            players.map((p, i) => (
                              <span key={i}>
                                <Name n={p} dup={isDup(p)} />
                                {i < players.length - 1 ? ", " : ""}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{players.length + (leader ? 1 : 0)}</td>
                      </>
                    ) : (
                      <td colSpan={3} className="py-1.5 italic text-neutral-400">Not deployed</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div data-testid={`print-reserves-${t.toLowerCase()}`} className="mt-4 break-inside-avoid">
              <h2 className="border-b border-black pb-1 text-[11pt] font-bold uppercase tracking-wide">Reserves ({plan.reserves.filter((r) => cleanName(r)).length})</h2>
              <p className="pt-1.5 text-[10pt]">
                {plan.reserves.map(cleanName).filter(Boolean).length ? (
                  plan.reserves.map(cleanName).filter(Boolean).map((r, i, arr) => (
                    <span key={i}>
                      <Name n={r} dup={isDup(r)} />
                      {i < arr.length - 1 ? ", " : ""}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </p>
            </div>
            {(hasDup || plan.reserves.some((r) => cleanName(r) && isDup(r))) && <p className="mt-3 text-[9pt] text-neutral-700">⚠ = member placed on more than one building (either team).</p>}
          </section>
        );
      })}
    </div>
  );
}

function Name({ n, dup }: { n: string; dup: boolean }) {
  return <span className={dup ? "font-semibold underline decoration-dotted" : ""}>{dup ? `⚠ ${n}` : n}</span>;
}
