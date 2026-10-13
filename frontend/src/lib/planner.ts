import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Logical stage width (px) — the map is laid out in this coordinate space, then scaled. */
export const STAGE_W = 600;
export const DEFAULT_MAP_SRC = "/canyon-map.jpg";
export const DEFAULT_MAP_RATIO = 1024 / 759; // height / width of the bundled map

export type TeamId = "A" | "B";
export const TEAMS: TeamId[] = ["A", "B"];
export const teamTitle = (t: TeamId) => `CANYON TEAM ${t}`;

export interface StructureDef {
  id: string;
  name: string;
  /** "below": nameplate hangs under the zone; "center": nameplate sits on the zone (edge-of-map zones). */
  plate: "below" | "center";
}

export interface Hotspot {
  x: number; // center, % of stage width
  y: number; // center, % of stage height
  w: number; // % of stage width
  h: number; // % of stage height
}

export interface Assignment {
  leader: string;
  players: string[];
}

export interface TeamPlan {
  selected: string[];
  assignments: Record<string, Assignment>;
}

export interface PlannerState {
  teams: Record<TeamId, TeamPlan>;
  hotspots: Record<string, Hotspot>;
  showArrows: boolean;
  /** Alliance member list, shared by both teams. */
  members: string[];
}

export const STRUCTURES: StructureDef[] = [
  { id: "power_tower", name: "Power Tower", plate: "below" },
  { id: "virus_lab", name: "Virus Lab", plate: "below" },
  { id: "defence_1", name: "Defence 1", plate: "below" },
  { id: "defence_2", name: "Defence 2", plate: "below" },
  { id: "serum_1", name: "Serum 1", plate: "below" },
  { id: "serum_2", name: "Serum 2", plate: "below" },
  { id: "warehouse_1", name: "Sample Warehouse 1", plate: "below" },
  { id: "warehouse_2", name: "Sample Warehouse 2", plate: "below" },
  { id: "warehouse_3", name: "Sample Warehouse 3", plate: "below" },
  { id: "warehouse_4", name: "Sample Warehouse 4", plate: "below" },
  { id: "spawn_1", name: "Dawnbreakers Spawn 1", plate: "center" },
  { id: "spawn_2", name: "Dawnbreakers Spawn 2", plate: "center" },
];

export const STRUCTURE_BY_ID: Record<string, StructureDef> = Object.fromEntries(
  STRUCTURES.map((s) => [s.id, s]),
);

/** Calibrated against the bundled 759x1024 canyon map. */
export const DEFAULT_HOTSPOTS: Record<string, Hotspot> = {
  power_tower: { x: 61, y: 32, w: 32, h: 18 },
  virus_lab: { x: 40, y: 59, w: 28, h: 17 },
  defence_1: { x: 8.5, y: 54.5, w: 14, h: 9 },
  defence_2: { x: 86, y: 29, w: 14, h: 11 },
  serum_1: { x: 11.5, y: 29, w: 14, h: 10 },
  serum_2: { x: 86, y: 55, w: 13, h: 10 },
  warehouse_1: { x: 13, y: 82, w: 22, h: 6 },
  warehouse_2: { x: 39, y: 82, w: 22, h: 6 },
  warehouse_3: { x: 64, y: 82, w: 22, h: 6 },
  warehouse_4: { x: 88, y: 82, w: 22, h: 6 },
  spawn_1: { x: 26, y: 92.5, w: 21, h: 11 },
  spawn_2: { x: 74, y: 92.5, w: 21, h: 11 },
};

/** Tactical vectors: [from, to] structure ids. Identical on both team maps. */
export const ARROWS: [string, string][] = [
  ["spawn_1", "warehouse_2"],
  ["spawn_2", "warehouse_3"],
  ["warehouse_1", "defence_1"],
  ["warehouse_4", "serum_2"],
  ["defence_1", "virus_lab"],
  ["serum_2", "virus_lab"],
  ["virus_lab", "power_tower"],
  ["serum_1", "power_tower"],
  ["defence_2", "power_tower"],
];

export interface ArrowGeom {
  x1: number; y1: number; cx: number; cy: number; x2: number; y2: number; angle: number;
}

/** Curved arrow between two hotspots, in logical stage px. */
export function arrowGeom(from: Hotspot, to: Hotspot, stageH: number): ArrowGeom {
  const ax = (from.x / 100) * STAGE_W, ay = (from.y / 100) * stageH;
  const bx = (to.x / 100) * STAGE_W, by = (to.y / 100) * stageH;
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const trim = Math.min(26, len * 0.25);
  const x1 = ax + ux * trim, y1 = ay + uy * trim;
  const x2 = bx - ux * trim, y2 = by - uy * trim;
  const bend = len * 0.14;
  const cx = (x1 + x2) / 2 - uy * bend, cy = (y1 + y2) / 2 + ux * bend;
  return { x1, y1, cx, cy, x2, y2, angle: Math.atan2(y2 - cy, x2 - cx) };
}

/** Top-center anchor of a nameplate, in % of stage. */
export function plateAnchor(h: Hotspot, def: StructureDef) {
  return def.plate === "center" ? { x: h.x, y: h.y - h.h / 4 } : { x: h.x, y: h.y + h.h / 2 + 0.4 };
}

/** Nameplate metrics shared by the DOM nameplate and the canvas export. Logical px. */
export const PLATE = {
  padX: 8, padY: 4, header: 7, leader: 12, player: 10, lh: 1.3, minW: 80, maxW: 170, radius: 2,
};
export const FONT_HEADING = '"Space Grotesk Variable", sans-serif';
export const FONT_SANS = '"Geist Variable", sans-serif';
export const FONT_MONO = '"JetBrains Mono Variable", monospace';

export const emptyAssignment = (): Assignment => ({ leader: "", players: [] });
const emptyTeam = (): TeamPlan => ({ selected: [], assignments: {} });

const STATE_KEY = "canyon_tactical_planner_state_v1";
const IMAGE_KEY = "canyon_tactical_planner_map_v1";

function loadState(): PlannerState {
  const base: PlannerState = {
    teams: { A: emptyTeam(), B: emptyTeam() },
    hotspots: { ...DEFAULT_HOTSPOTS },
    showArrows: false,
    members: [],
  };
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<PlannerState>;
    return {
      teams: {
        A: { ...emptyTeam(), ...p.teams?.A },
        B: { ...emptyTeam(), ...p.teams?.B },
      },
      hotspots: { ...DEFAULT_HOTSPOTS, ...p.hotspots },
      showArrows: p.showArrows ?? false,
      members: Array.isArray(p.members) ? p.members : [],
    };
  } catch {
    return base;
  }
}

export function usePlanner() {
  const [state, setState] = useState<PlannerState>(loadState);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        setSavedAt(new Date());
      } catch {
        /* storage full or unavailable — keep working in memory */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [state]);

  // Flush immediately on reload/close/tab-hide so a change inside the debounce window is never lost.
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify(latest.current));
      } catch {
        /* ignore */
      }
    };
    const onVis = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const updateTeam = useCallback((team: TeamId, fn: (t: TeamPlan) => TeamPlan) => {
    setState((s) => ({ ...s, teams: { ...s.teams, [team]: fn(s.teams[team]) } }));
  }, []);

  const updateAssignment = useCallback(
    (team: TeamId, id: string, fn: (a: Assignment) => Assignment) =>
      updateTeam(team, (t) => ({
        ...t,
        assignments: { ...t.assignments, [id]: fn(t.assignments[id] ?? emptyAssignment()) },
      })),
    [updateTeam],
  );

  const actions = useMemo(
    () => ({
      select: (team: TeamId, id: string) =>
        updateTeam(team, (t) => (t.selected.includes(id) ? t : { ...t, selected: [...t.selected, id] })),
      deselect: (team: TeamId, id: string) =>
        updateTeam(team, (t) => ({ ...t, selected: t.selected.filter((s) => s !== id) })),
      removeStructure: (team: TeamId, id: string) =>
        updateTeam(team, (t) => {
          const assignments = { ...t.assignments };
          delete assignments[id];
          return { selected: t.selected.filter((s) => s !== id), assignments };
        }),
      setLeader: (team: TeamId, id: string, leader: string) =>
        updateAssignment(team, id, (a) => ({ ...a, leader })),
      addPlayer: (team: TeamId, id: string, name: string) =>
        updateAssignment(team, id, (a) => ({ ...a, players: [...a.players, name] })),
      updatePlayer: (team: TeamId, id: string, idx: number, name: string) =>
        updateAssignment(team, id, (a) => ({ ...a, players: a.players.map((p, i) => (i === idx ? name : p)) })),
      removePlayer: (team: TeamId, id: string, idx: number) =>
        updateAssignment(team, id, (a) => ({ ...a, players: a.players.filter((_, i) => i !== idx) })),
      clearTeam: (team: TeamId) => updateTeam(team, () => emptyTeam()),
      moveHotspot: (id: string, x: number, y: number) =>
        setState((s) => ({ ...s, hotspots: { ...s.hotspots, [id]: { ...s.hotspots[id], x, y } } })),
      resetHotspots: () => setState((s) => ({ ...s, hotspots: { ...DEFAULT_HOTSPOTS } })),
      setShowArrows: (showArrows: boolean) => setState((s) => ({ ...s, showArrows })),
      setMembers: (members: string[]) => setState((s) => ({ ...s, members: dedupeNames(members) })),
    }),
    [updateTeam, updateAssignment],
  );

  return { state, savedAt, actions };
}

export type PlannerActions = ReturnType<typeof usePlanner>["actions"];

/** Map image shared by both teams; uploads are persisted as a data URL when storage allows. */
export function useMapImage() {
  const [src, setSrc] = useState<string>(() => {
    try {
      return localStorage.getItem(IMAGE_KEY) ?? DEFAULT_MAP_SRC;
    } catch {
      return DEFAULT_MAP_SRC;
    }
  });

  const replace = useCallback((dataUrl: string): boolean => {
    setSrc(dataUrl);
    try {
      localStorage.setItem(IMAGE_KEY, dataUrl);
      return true;
    } catch {
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setSrc(DEFAULT_MAP_SRC);
    try {
      localStorage.removeItem(IMAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { src, isDefault: src === DEFAULT_MAP_SRC, replace, reset };
}

export const cleanName = (s: string) => s.trim();

/** Trim + case-insensitive dedupe, keeping first spelling and order. */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const n of names) {
    const c = cleanName(n);
    if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
  }
  return [...seen.values()];
}

/** Split pasted text (newlines or commas) into names. */
export const parseNames = (text: string) => dedupeNames(text.split(/[\n,;]+/));

/** Every distinct name in the member list or used as leader/player on either team. */
export function collectNames(teams: Record<TeamId, TeamPlan>, members: string[] = []): string[] {
  const used = TEAMS.flatMap((t) => Object.values(teams[t].assignments).flatMap((a) => [a.leader, ...a.players]));
  return dedupeNames([...members, ...used]).sort((x, y) => x.localeCompare(y));
}

/** Lowercased names placed on a visible (selected) structure in either team. */
export function assignedNames(teams: Record<TeamId, TeamPlan>): Set<string> {
  const out = new Set<string>();
  for (const t of TEAMS) {
    for (const id of teams[t].selected) {
      const a = teams[t].assignments[id];
      if (!a) continue;
      for (const n of [a.leader, ...a.players]) {
        const c = cleanName(n);
        if (c) out.add(c.toLowerCase());
      }
    }
  }
  return out;
}

export interface Placement { team: TeamId; id: string; role: "leader" | "player" }
export interface NamePlacements { name: string; placements: Placement[] }

/** Where each name sits on visible (selected) structures, keyed by lowercased name. */
export function placementsByName(teams: Record<TeamId, TeamPlan>): Map<string, NamePlacements> {
  const out = new Map<string, NamePlacements>();
  for (const t of TEAMS) {
    for (const id of teams[t].selected) {
      const a = teams[t].assignments[id];
      if (!a) continue;
      const entries: [string, Placement["role"]][] = [[a.leader, "leader"], ...a.players.map((p): [string, Placement["role"]] => [p, "player"])];
      for (const [n, role] of entries) {
        const c = cleanName(n);
        if (!c) continue;
        const k = c.toLowerCase();
        const cur = out.get(k) ?? { name: c, placements: [] };
        cur.placements.push({ team: t, id, role });
        out.set(k, cur);
      }
    }
  }
  return out;
}

/** Names placed more than once across both teams. */
export const findDuplicates = (m: Map<string, NamePlacements>) =>
  [...m.values()].filter((v) => v.placements.length > 1).sort((a, b) => a.name.localeCompare(b.name));

export const placementLabel = (p: Placement) =>
  `Team ${p.team} · ${STRUCTURE_BY_ID[p.id]?.name ?? p.id}${p.role === "leader" ? " (leader)" : ""}`;

/** Members not on any building in Team A or Team B. */
export function unassignedMembers(members: string[], teams: Record<TeamId, TeamPlan>): string[] {
  const used = assignedNames(teams);
  return members.filter((m) => !used.has(m.toLowerCase()));
}

/** Names matching the query (prefix matches first), excluding names already used here. */
export function suggestNames(all: string[], query: string, exclude: string[], limit = 6): string[] {
  const q = cleanName(query).toLowerCase();
  if (!q) return [];
  const ex = new Set(exclude.map((e) => cleanName(e).toLowerCase()));
  const hits = all.filter((n) => !ex.has(n.toLowerCase()) && n.toLowerCase().includes(q));
  hits.sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)));
  return hits.slice(0, limit);
}
