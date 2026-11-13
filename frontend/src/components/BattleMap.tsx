import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import Nameplate from "@/components/Nameplate";
import {
  DEFAULT_MAP_RATIO, ROUTES, ROUTE_STYLE, STAGE_W, STRUCTURES, emptyAssignment, isRouteVisible, plateAnchor, routeGeom,
} from "@/lib/planner";
import type { Hotspot, PlateOffset, TeamPlan } from "@/lib/planner";

interface Props {
  imageSrc: string;
  hotspots: Record<string, Hotspot>;
  plateOffsets: Record<string, PlateOffset>;
  plan: TeamPlan;
  focusedId: string | null;
  editMode: boolean;
  routeVisibility: Record<string, boolean>;
  onHotspotClick: (id: string) => void;
  onHotspotMove: (id: string, x: number, y: number) => void;
  onPlateMove: (id: string, dx: number, dy: number) => void;
  onBackgroundClick: () => void;
  /** Extra controls rendered in the toolbar under the map (e.g. mobile Assignments button). */
  toolbarExtra?: ReactNode;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function BattleMap(p: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [stageH, setStageH] = useState(STAGE_W * DEFAULT_MAP_RATIO);
  const [view, setView] = useState({ s: 1, tx: 0, ty: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinch = useRef<{ d: number; s: number; mx: number; my: number; tx: number; ty: number } | null>(null);
  const drag = useRef<{ kind: "zone" | "plate"; id: string; cx: number; cy: number; x: number; y: number } | null>(null);
  const moved = useRef(false);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    const s = Math.max(width / STAGE_W, height / stageH) * 0.94;
    setView({ s, tx: (width - STAGE_W * s) / 2, ty: (height - stageH * s) / 2 });
  }, [stageH]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  const zoomAt = useCallback((cx: number, cy: number, f: number) => {
    setView((v) => {
      const s = clamp(v.s * f, 0.2, 8);
      const r = s / v.s;
      return { s, tx: cx - (cx - v.tx) * r, ty: cy - (cy - v.ty) * r };
    });
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const zoomCenter = (f: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) zoomAt(r.width / 2, r.height / 2, f);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag.current) return;
    const r = wrapRef.current!.getBoundingClientRect();
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: view.s,
        mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, tx: view.tx, ty: view.ty,
      };
      pan.current = null;
      moved.current = true;
    } else if (pointers.current.size === 1) {
      pan.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
      moved.current = false;
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.cx, dy = e.clientY - d.cy;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      const nx = d.x + (dx / (STAGE_W * view.s)) * 100;
      const ny = d.y + (dy / (stageH * view.s)) * 100;
      if (d.kind === "zone") p.onHotspotMove(d.id, clamp(nx, 0, 100), clamp(ny, 0, 100));
      else p.onPlateMove(d.id, clamp(nx, -100, 100), clamp(ny, -100, 100));
      return;
    }
    const pc = pinch.current;
    if (pc && pointers.current.size === 2) {
      const r = wrapRef.current!.getBoundingClientRect();
      const [a, b] = [...pointers.current.values()];
      const s = clamp((pc.s * Math.hypot(a.x - b.x, a.y - b.y)) / pc.d, 0.2, 8);
      const k = s / pc.s;
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      setView({ s, tx: mx - (pc.mx - pc.tx) * k, ty: my - (pc.my - pc.ty) * k });
      return;
    }
    const pn = pan.current;
    if (pn) {
      const dx = e.clientX - pn.x, dy = e.clientY - pn.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
      if (moved.current) setView((v) => ({ ...v, tx: pn.tx + dx, ty: pn.ty + dy }));
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      pan.current = null;
      drag.current = null;
    }
  };

  const startDrag = (id: string) => (e: ReactPointerEvent) => {
    if (!p.editMode) return;
    e.stopPropagation();
    const h = p.hotspots[id];
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { kind: "zone", id, cx: e.clientX, cy: e.clientY, x: h.x, y: h.y };
    moved.current = false;
  };

  const startPlateDrag = (id: string) => (e: ReactPointerEvent) => {
    const h = p.hotspots[id];
    const o = p.plateOffsets[id] ?? { dx: 0, dy: h.h / 2 + 0.4 };
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { kind: "plate", id, cx: e.clientX, cy: e.clientY, x: o.dx, y: o.dy };
    moved.current = false;
  };

  return (
    <div className="flex h-full w-full flex-col">
    <div
      ref={wrapRef}
      data-testid="map-workspace"
      role="region"
      aria-label="Battle map workspace"
      className="hud-grid relative min-h-0 w-full flex-1 touch-none select-none overflow-hidden cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      onClick={() => {
        if (!moved.current) p.onBackgroundClick();
      }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: STAGE_W, height: stageH, transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})` }}
      >
        <img
          src={p.imageSrc}
          alt="Battlefield map"
          data-testid="map-image"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth) setStageH((STAGE_W * img.naturalHeight) / img.naturalWidth);
          }}
          className="pointer-events-none absolute inset-0 h-full w-full rounded-sm shadow-[0_0_40px_rgba(0,229,255,0.15)]"
        />
        <div className="scanlines pointer-events-none absolute inset-0" />

        <svg
          data-testid="tactical-routes"
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
          width={STAGE_W}
          height={stageH}
          viewBox={`0 0 ${STAGE_W} ${stageH}`}
        >
          {ROUTES.map((r) => {
            if (!isRouteVisible(p.routeVisibility, r.id)) return null;
            const hf = p.hotspots[r.from], ht = p.hotspots[r.to];
            if (!hf || !ht) return null;
            const a = routeGeom(r, hf, ht, stageH);
            const deg = (a.angle * 180) / Math.PI;
            const hd = ROUTE_STYLE.head;
            return (
              <g key={r.id} data-testid={`route-${r.id}`} style={{ filter: `drop-shadow(0 0 ${ROUTE_STYLE.glow / 2}px ${r.color}) drop-shadow(0 0 ${ROUTE_STYLE.glow}px ${r.color})` }}>
                <path
                  d={`M ${a.x1} ${a.y1} Q ${a.cx} ${a.cy} ${a.x2} ${a.y2}`}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={ROUTE_STYLE.width}
                  strokeLinecap="round"
                  strokeDasharray={ROUTE_STYLE.dash.join(" ")}
                  className="route-flow"
                />
                <polygon
                  points={`${hd * 0.5},0 ${-hd},${-hd * 0.6} ${-hd * 0.6},0 ${-hd},${hd * 0.6}`}
                  fill={r.color}
                  transform={`translate(${a.x2} ${a.y2}) rotate(${deg})`}
                />
              </g>
            );
          })}
        </svg>

        {STRUCTURES.map((s) => {
          const h = p.hotspots[s.id];
          if (!h) return null;
          const selected = p.plan.selected.includes(s.id);
          const focused = p.focusedId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              data-testid={`structure-${s.id}`}
              aria-pressed={selected}
              aria-label={s.name}
              onPointerDown={p.editMode ? startDrag(s.id) : undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (!moved.current) p.onHotspotClick(s.id);
              }}
              className={[
                "zone group absolute z-[15] rounded-[3px] outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-out",
                p.editMode
                  ? "cursor-move border border-dashed border-amber-300/90 bg-amber-300/10"
                  : selected
                    ? "zone-selected cursor-pointer border border-[#00E5FF] bg-[#00E5FF]/10"
                    : "cursor-pointer border border-transparent hover:border-[#00E5FF]/70 hover:bg-[#00E5FF]/[0.07] focus-visible:border-[#00E5FF]",
                focused ? "zone-focused" : "",
              ].join(" ")}
              style={{ left: `${h.x - h.w / 2}%`, top: `${h.y - h.h / 2}%`, width: `${h.w}%`, height: `${h.h}%` }}
            >
              {(selected || p.editMode) && (
                <>
                  <span className="corner tl" />
                  <span className="corner tr" />
                  <span className="corner bl" />
                  <span className="corner br" />
                </>
              )}
              <span
                className={`pointer-events-none absolute -top-[11px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-[#050D1A]/90 px-1 py-px font-mono text-[6.5px] uppercase tracking-[0.15em] text-[#7DD3FC] transition-opacity duration-200 ${p.editMode ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}
              >
                {s.name}
              </span>
            </button>
          );
        })}

        {STRUCTURES.filter((s) => p.plan.selected.includes(s.id) && p.hotspots[s.id]).map((s) => {
          const a = plateAnchor(p.hotspots[s.id], p.plateOffsets[s.id]);
          return (
            <Nameplate
              key={s.id}
              id={s.id}
              name={s.name}
              assignment={p.plan.assignments[s.id] ?? emptyAssignment()}
              x={a.x}
              y={a.y}
              focused={p.focusedId === s.id}
              editMode={p.editMode}
              onClick={() => p.onHotspotClick(s.id)}
              onDragStart={startPlateDrag(s.id)}
            />
          );
        })}
      </div>

    </div>

    {/* Toolbar under the map: never overlaps the battlefield */}
    <div
      data-testid="map-toolbar"
      className="flex h-12 shrink-0 items-center gap-2 border-t border-[#00E5FF]/20 bg-[#050D1A]/90 px-2"
    >
      <div className="flex items-center overflow-hidden rounded-md border border-[#00E5FF]/30">
        <button type="button" data-testid="zoom-out-btn" aria-label="Zoom out" onClick={() => zoomCenter(0.8)} className="hud-icon-btn h-9 w-10">
          <Minus className="size-4" />
        </button>
        <span data-testid="zoom-level" className="min-w-14 border-x border-[#00E5FF]/20 px-2 text-center font-mono text-[11px] tracking-[0.12em] text-[#7DD3FC]">
          {Math.round(view.s * 100)}%
        </span>
        <button type="button" data-testid="zoom-in-btn" aria-label="Zoom in" onClick={() => zoomCenter(1.25)} className="hud-icon-btn h-9 w-10">
          <Plus className="size-4" />
        </button>
      </div>
      <button
        type="button"
        data-testid="zoom-reset-btn"
        aria-label="Fit map"
        onClick={fit}
        className="flex h-9 items-center gap-1.5 rounded-md border border-[#00E5FF]/30 px-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#B9D4F0] transition-colors duration-200 hover:bg-[#00E5FF]/12 hover:text-white"
      >
        <Maximize className="size-4" /> <span className="hidden sm:inline">Fit</span>
      </button>
      <span className="ml-1 hidden font-mono text-[10px] uppercase tracking-[0.15em] text-[#5B7A9C] md:inline">
        {p.editMode ? "Drag zones & nameplates" : "Scroll / pinch to zoom · drag to pan"}
      </span>
      <div className="ml-auto flex items-center">{p.toolbarExtra}</div>
    </div>
    </div>
  );
}
