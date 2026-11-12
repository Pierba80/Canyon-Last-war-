import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Logical stage width (px) — the map is laid out in this coordinate space, then scaled. */
export const STAGE_W = 600;
export const DEFAULT_MAP_SRC = "/canyon-map-v2.jpg";
export const DEFAULT_MAP_RATIO = 1457 / 1079; // height / width of the bundled map
/** Bump when default hotspot/nameplate positions change, so stale saved layouts are replaced. */
export const LAYOUT_VERSION = 2;

export type TeamId = "A" | "B";
export const TEAMS: TeamId[] = ["A", "B"];
export const teamTitle = (t: TeamId) => `CANYON TEAM ${t}`;

export interface StructureDef {
  id: string;
  name: string;
}

/** Nameplate top-center offset from its hotspot center, in % of stage. */
export interface PlateOffset {
  dx: number;
  dy: number;
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
  /** Reserve players for this team (not on a building). */
  reserves: string[];
}

/** Shared battle start. `at` is a local "YYYY-MM-DDTHH:mm" (datetime-local value). */
export interface BattleSchedule {
  at: string | null;
  weekly: boolean;
}

export const RESERVES_ID = "reserves";

export interface PlannerState {
  teams: Record<TeamId, TeamPlan>;
  hotspots: Record<string, Hotspot>;
  plateOffsets: Record<string, PlateOffset>;
  layoutVersion: number;
  /** Per-team route visibility; a missing key means visible. */
  routeVisibility: Record<TeamId, Record<string, boolean>>;
  /** Alliance member list, shared by both teams. */
  members: string[];
  battle: BattleSchedule;
}

export const STRUCTURES: StructureDef[] = [
  { id: "data_center_1", name: "Data Center 1" },
  { id: "data_center_2", name: "Data Center 2" },
  { id: "power_tower", name: "Power Tower" },
  { id: "virus_lab", name: "Virus Lab" },
  { id: "defence_1", name: "Defence 1" },
  { id: "defence_2", name: "Defence 2" },
  { id: "serum_1", name: "Serum 1" },
  { id: "serum_2", name: "Serum 2" },
  { id: "warehouse_1", name: "Sample Warehouse 1" },
  { id: "warehouse_2", name: "Sample Warehouse 2" },
  { id: "warehouse_3", name: "Sample Warehouse 3" },
  { id: "warehouse_4", name: "Sample Warehouse 4" },
  { id: "spawn_1", name: "Dawnbreakers Spawn 1" },
  { id: "spawn_2", name: "Dawnbreakers Spawn 2" },
];

export const STRUCTURE_BY_ID: Record<string, StructureDef> = Object.fromEntries(
  STRUCTURES.map((s) => [s.id, s]),
);

/** Squares centered on each building graphic, calibrated against the bundled 1079x1457 canyon map (% of stage). */
export const DEFAULT_HOTSPOTS: Record<string, Hotspot> = {
  data_center_1: { x: 10.4, y: 18.6, w: 9, h: 7 },
  data_center_2: { x: 65.1, y: 18.6, w: 9, h: 7 },
  power_tower: { x: 59.3, y: 33.6, w: 31, h: 18.5 },
  virus_lab: { x: 38, y: 60.5, w: 27, h: 22 },
  defence_1: { x: 8.8, y: 55.9, w: 12, h: 10 },
  defence_2: { x: 83.5, y: 31.4, w: 11, h: 10 },
  serum_1: { x: 10.1, y: 30.2, w: 12, h: 10 },
  serum_2: { x: 81.3, y: 55.6, w: 10, h: 10 },
  warehouse_1: { x: 6.4, y: 79.7, w: 7.5, h: 6 },
  warehouse_2: { x: 29.7, y: 79.7, w: 7.5, h: 6 },
  warehouse_3: { x: 53.1, y: 79.7, w: 7.5, h: 6 },
  warehouse_4: { x: 75.8, y: 79.7, w: 7.5, h: 6 },
  spawn_1: { x: 24.3, y: 91.8, w: 22.7, h: 13.6 },
  spawn_2: { x: 69.9, y: 91.8, w: 22.4, h: 13.6 },
};

/**
 * Default nameplate offsets (top-center, % from hotspot center). Every plate sits where it never covers a
 * printed building name: below the label for side panels, beside the label for the Virus Lab, above the
 * Data Centers, and clear of the Dawnbreakers labels for the warehouse row.
 */
export const DEFAULT_PLATE_OFFSETS: Record<string, PlateOffset> = {
  data_center_1: { dx: 0, dy: -11.1 },
  data_center_2: { dx: 0, dy: -11.1 },
  power_tower: { dx: 0, dy: 9.7 },
  virus_lab: { dx: 24, dy: 1.2 },
  defence_1: { dx: 0, dy: 14.3 },
  defence_2: { dx: 0, dy: 12.1 },
  serum_1: { dx: 0, dy: 13.3 },
  serum_2: { dx: 0, dy: 14.6 },
  warehouse_1: { dx: 2.6, dy: 4.1 },
  warehouse_2: { dx: 10.3, dy: 4.1 },
  warehouse_3: { dx: 2.4, dy: 4.1 },
  warehouse_4: { dx: 11.2, dy: 4.1 },
  spawn_1: { dx: 0, dy: 1.2 },
  spawn_2: { dx: 0, dy: 1.2 },
};

export type RouteGroup = "data_center" | "virus_lab" | "power_tower";

export interface RouteDef {
  id: string;
  from: string;
  to: string;
  color: string;
  group: RouteGroup;
  /** Curvature as a fraction of route length; positive bows to the left of travel direction. */
  bend: number;
  /** Perpendicular shift (logical px, left of travel) — separates the two directions of a bidirectional pair. */
  offset?: number;
}

export const ROUTE_GROUPS: { id: RouteGroup; label: string; color: string }[] = [
  { id: "data_center", label: "Data Center routes", color: "#43D6FF" },
  { id: "virus_lab", label: "Virus Lab routes", color: "#47E0A0" },
  { id: "power_tower", label: "Power Tower routes", color: "#FFB46B" },
];

const VL = "#47E0A0";
const PT = "#FFB46B";

/** The 12 predefined tactical routes. Identical on both team maps; visibility is per team. */
export const ROUTES: RouteDef[] = [
  { id: "dc1_serum1", from: "data_center_1", to: "serum_1", color: "#E9B84B", group: "data_center", bend: 0.12 },
  { id: "dc1_defence1", from: "data_center_1", to: "defence_1", color: "#43D6FF", group: "data_center", bend: -0.4 },
  { id: "dc2_defence2", from: "data_center_2", to: "defence_2", color: "#F17A64", group: "data_center", bend: 0.15 },
  { id: "dc2_serum2", from: "data_center_2", to: "serum_2", color: "#BA87F5", group: "data_center", bend: 0.12 },
  { id: "vl_serum1", from: "virus_lab", to: "serum_1", color: VL, group: "virus_lab", bend: 0.1 },
  { id: "vl_serum2", from: "virus_lab", to: "serum_2", color: VL, group: "virus_lab", bend: -0.25 },
  { id: "vl_defence1", from: "virus_lab", to: "defence_1", color: VL, group: "virus_lab", bend: 0.12 },
  { id: "vl_defence2", from: "virus_lab", to: "defence_2", color: VL, group: "virus_lab", bend: 0.3 },
  { id: "vl_power_tower", from: "virus_lab", to: "power_tower", color: VL, group: "virus_lab", bend: 0.1, offset: 6 },
  { id: "pt_dc1", from: "power_tower", to: "data_center_1", color: PT, group: "power_tower", bend: 0.2 },
  { id: "pt_dc2", from: "power_tower", to: "data_center_2", color: PT, group: "power_tower", bend: 0 },
  { id: "pt_virus_lab", from: "power_tower", to: "virus_lab", color: PT, group: "power_tower", bend: 0.1, offset: 6 },
];

export const routeLabel = (r: RouteDef) =>
  `${STRUCTURE_BY_ID[r.from]?.name ?? r.from} → ${STRUCTURE_BY_ID[r.to]?.name ?? r.to}`;

export const isRouteVisible = (vis: Record<string, boolean> | undefined, id: string) => vis?.[id] !== false;

export interface ArrowGeom {
  x1: number; y1: number; cx: number; cy: number; x2: number; y2: number; angle: number;
}

/** Endpoints start/stop this fraction of the way to the hotspot edge, so lines touch the building graphic. */
const ROUTE_TRIM = 0.75;

/** Distance from a rect's center to its edge along unit vector (ux, uy). */
function exitDist(hw: number, hh: number, ux: number, uy: number) {
  const tx = Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Infinity;
  const ty = Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Infinity;
  return Math.min(tx, ty);
}

/** Curved route between two hotspots, in logical stage px. Recomputed from hotspots, so it follows any layout. */
export function routeGeom(r: RouteDef, from: Hotspot, to: Hotspot, stageH: number): ArrowGeom {
  const px = (h: Hotspot) => ({ x: (h.x / 100) * STAGE_W, y: (h.y / 100) * stageH, hw: (h.w / 200) * STAGE_W, hh: (h.h / 200) * stageH });
  const A = px(from), B = px(to);
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux; // left normal of travel direction (screen coords)
  const off = r.offset ?? 0;
  let ta = exitDist(A.hw, A.hh, ux, uy) * ROUTE_TRIM + 3;
  let tb = exitDist(B.hw, B.hh, ux, uy) * ROUTE_TRIM + 3;
  if (ta + tb > len * 0.8) {
    const k = (len * 0.8) / (ta + tb);
    ta *= k;
    tb *= k;
  }
  const x1 = A.x + ux * ta + nx * off, y1 = A.y + uy * ta + ny * off;
  const x2 = B.x - ux * tb + nx * off, y2 = B.y - uy * tb + ny * off;
  const bend = Math.hypot(x2 - x1, y2 - y1) * r.bend;
  const cx = (x1 + x2) / 2 + nx * bend, cy = (y1 + y2) / 2 + ny * bend;
  return { x1, y1, cx, cy, x2, y2, angle: Math.atan2(y2 - cy, x2 - cx) };
}

/** Route stroke + arrowhead style, shared by the SVG overlay and the PNG export. */
export const ROUTE_STYLE = { width: 1.6, dash: [6, 4] as [number, number], head: 7.5, glow: 4 };

/** Top-center anchor of a nameplate, in % of stage. */
export function plateAnchor(h: Hotspot, offset: PlateOffset | undefined) {
  const o = offset ?? { dx: 0, dy: h.h / 2 + 0.4 };
  return { x: h.x + o.dx, y: h.y + o.dy };
}

/** Left edge (logical px) of a plate of width w centered at cx, kept inside the map with a small margin. */
export const plateLeft = (cx: number, w: number) => Math.min(STAGE_W - 4 - w, Math.max(4, cx - w / 2));

/** Nameplate metrics shared by the DOM nameplate and the canvas export. Logical px. */
export const PLATE = {
  padX: 8, padY: 4, header: 7, leader: 12, player: 10, lh: 1.3, minW: 80, maxW: 170, radius: 2,
};
export const FONT_HEADING = '"Space Grotesk Variable", sans-serif';
export const FONT_SANS = '"Geist Variable", sans-serif';
export const FONT_MONO = '"JetBrains Mono Variable", monospace';

export const emptyAssignment = (): Assignment => ({ leader: "", players: [] });
const emptyTeam = (): TeamPlan => ({ selected: [], assignments: {}, reserves: [] });

const STATE_KEY = "canyon_tactical_planner_state_v1";
const IMAGE_KEY = "canyon_tactical_planner_map_v1";

function loadState(): PlannerState {
  const base: PlannerState = {
    teams: { A: emptyTeam(), B: emptyTeam() },
    hotspots: { ...DEFAULT_HOTSPOTS },
    plateOffsets: { ...DEFAULT_PLATE_OFFSETS },
    layoutVersion: LAYOUT_VERSION,
    routeVisibility: { A: {}, B: {} },
    members: [],
    battle: { at: null, weekly: false },
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
      // Saved positions only survive if they were made against the current default layout.
      ...(p.layoutVersion === LAYOUT_VERSION
        ? { hotspots: { ...DEFAULT_HOTSPOTS, ...p.hotspots }, plateOffsets: { ...DEFAULT_PLATE_OFFSETS, ...p.plateOffsets } }
        : { hotspots: { ...DEFAULT_HOTSPOTS }, plateOffsets: { ...DEFAULT_PLATE_OFFSETS } }),
      layoutVersion: LAYOUT_VERSION,
      routeVisibility: { A: { ...p.routeVisibility?.A }, B: { ...p.routeVisibility?.B } },
      members: Array.isArray(p.members) ? p.members : [],
      battle: { at: p.battle?.at ?? null, weekly: p.battle?.weekly ?? false },
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
          return { ...t, selected: t.selected.filter((s) => s !== id), assignments };
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
      movePlate: (id: string, dx: number, dy: number) =>
        setState((s) => ({ ...s, plateOffsets: { ...s.plateOffsets, [id]: { dx, dy } } })),
      resetHotspots: () =>
        setState((s) => ({ ...s, hotspots: { ...DEFAULT_HOTSPOTS }, plateOffsets: { ...DEFAULT_PLATE_OFFSETS } })),
      /** Show or hide a set of routes for one team only. */
      setRoutes: (team: TeamId, ids: string[], visible: boolean) =>
        setState((s) => {
          const next = { ...s.routeVisibility[team] };
          for (const id of ids) next[id] = visible;
          return { ...s, routeVisibility: { ...s.routeVisibility, [team]: next } };
        }),
      setBattle: (battle: BattleSchedule) => setState((s) => ({ ...s, battle })),
      addReserves: (team: TeamId, names: string[]) =>
        updateTeam(team, (t) => ({ ...t, reserves: [...t.reserves, ...names] })),
      updateReserve: (team: TeamId, idx: number, name: string) =>
        updateTeam(team, (t) => ({ ...t, reserves: t.reserves.map((r, i) => (i === idx ? name : r)) })),
      removeReserve: (team: TeamId, idx: number) =>
        updateTeam(team, (t) => ({ ...t, reserves: t.reserves.filter((_, i) => i !== idx) })),
      /** Move a reserve onto a building as an allied player (selects the building). */
      promoteReserve: (team: TeamId, idx: number, id: string) =>
        updateTeam(team, (t) => {
          const name = t.reserves[idx];
          if (name === undefined) return t;
          const a = t.assignments[id] ?? emptyAssignment();
          return {
            selected: t.selected.includes(id) ? t.selected : [...t.selected, id],
            assignments: { ...t.assignments, [id]: { ...a, players: [...a.players, name] } },
            reserves: t.reserves.filter((_, i) => i !== idx),
          };
        }),
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
  const used = TEAMS.flatMap((t) => [
    ...Object.values(teams[t].assignments).flatMap((a) => [a.leader, ...a.players]),
    ...teams[t].reserves,
  ]);
  return dedupeNames([...members, ...used]).sort((x, y) => x.localeCompare(y));
}

/** Lowercased names placed on a visible (selected) structure or the reserves of either team. */
export function assignedNames(teams: Record<TeamId, TeamPlan>): Set<string> {
  const out = new Set<string>();
  for (const t of TEAMS) {
    for (const r of teams[t].reserves) {
      const c = cleanName(r);
      if (c) out.add(c.toLowerCase());
    }
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

export interface Placement { team: TeamId; id: string; role: "leader" | "player" | "reserve" }
export interface NamePlacements { name: string; placements: Placement[] }

/** Where each name sits on visible (selected) structures, keyed by lowercased name. */
export function placementsByName(teams: Record<TeamId, TeamPlan>): Map<string, NamePlacements> {
  const out = new Map<string, NamePlacements>();
  const put = (n: string, p: Placement) => {
    const c = cleanName(n);
    if (!c) return;
    const k = c.toLowerCase();
    const cur = out.get(k) ?? { name: c, placements: [] };
    cur.placements.push(p);
    out.set(k, cur);
  };
  for (const t of TEAMS) {
    for (const id of teams[t].selected) {
      const a = teams[t].assignments[id];
      if (!a) continue;
      put(a.leader, { team: t, id, role: "leader" });
      a.players.forEach((p) => put(p, { team: t, id, role: "player" }));
    }
    teams[t].reserves.forEach((r) => put(r, { team: t, id: RESERVES_ID, role: "reserve" }));
  }
  return out;
}

/** Names placed more than once across both teams. */
export const findDuplicates = (m: Map<string, NamePlacements>) =>
  [...m.values()].filter((v) => v.placements.length > 1).sort((a, b) => a.name.localeCompare(b.name));

export const placementLabel = (p: Placement) =>
  p.role === "reserve"
    ? `Team ${p.team} · Reserves`
    : `Team ${p.team} · ${STRUCTURE_BY_ID[p.id]?.name ?? p.id}${p.role === "leader" ? " (leader)" : ""}`;

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
