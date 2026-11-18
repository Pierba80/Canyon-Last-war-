import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { FONT_HEADING, FONT_MONO, FONT_SANS, PLATE, SQUAD_OPTIONS, STAGE_W, plateLeft, profileKey } from "@/lib/planner";
import type { Assignment, PlayerProfile } from "@/lib/planner";

interface Props {
  id: string;
  name: string;
  assignment: Assignment;
  profiles: Record<string, PlayerProfile>;
  x: number;
  y: number;
  focused: boolean;
  editMode: boolean;
  onClick: () => void;
  onDragStart: (e: ReactPointerEvent) => void;
}

function PlateMemberLine({ name, profiles, isLeader, size }: { name: string; profiles: Record<string, PlayerProfile>; isLeader?: boolean; size: number }) {
  const prof = profiles[profileKey(name)];
  const squad = prof ? SQUAD_OPTIONS.find((s) => s.id === prof.squad) : null;
  const isImg = prof?.avatar?.startsWith("data:");
  return (
    <span className="inline-flex max-w-full items-center justify-center gap-1 truncate">
      {prof && (
        isImg ? (
          <img src={prof.avatar} alt="" className="inline-block rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
        ) : (
          <span className="shrink-0" style={{ fontSize: size * 0.85 }}>{prof.avatar || "🎖️"}</span>
        )
      )}
      <span className="truncate">{isLeader ? `★ ${name}` : name}</span>
      {squad && <span className="shrink-0" style={{ fontSize: size * 0.8 }}>{squad.icon}</span>}
      {prof?.power && (
        <span className="shrink-0 font-mono text-[#7DD3FC]" style={{ fontSize: size * 0.65 }}>
          {prof.power}
        </span>
      )}
    </span>
  );
}

/** Glowing nameplate on the map. Sizes are logical stage px, mirrored by the canvas export. */
export default function Nameplate({ id, name, assignment, profiles, x, y, focused, editMode, onClick, onDragStart }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [w, setW] = useState<number>(PLATE.minW);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.offsetWidth);
    const ro = new ResizeObserver(() => setW(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const leader = assignment.leader.trim();
  const players = assignment.players.map((p) => p.trim()).filter(Boolean);
  return (
    <button
      ref={ref}
      type="button"
      data-testid={`nameplate-${id}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onClick();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (editMode) onDragStart(e);
      }}
      className={`np-glow absolute z-20 text-center transition-[box-shadow,transform] duration-200 ease-out ${editMode ? "cursor-move outline-1 outline-dashed outline-offset-2 outline-amber-300/90" : "cursor-pointer hover:scale-[1.04]"} ${focused ? "np-focused" : ""}`}
      style={{
        left: plateLeft((x / 100) * STAGE_W, w),
        top: `${y}%`,
        minWidth: PLATE.minW * 1.5,
        maxWidth: PLATE.maxW * 1.9,
        padding: `${PLATE.padY + 2}px ${PLATE.padX + 4}px`,
        borderRadius: PLATE.radius,
        lineHeight: PLATE.lh,
      }}
      aria-label={editMode ? `Drag ${name} nameplate` : `Edit ${name} assignment`}
    >
      <span
        className="block truncate uppercase text-[#7DD3FC]"
        style={{ fontFamily: FONT_MONO, fontSize: PLATE.header + 5, fontWeight: 600 }}
      >
        {name}
      </span>
      {leader ? (
        <span
          data-testid={`nameplate-leader-${id}`}
          className="block truncate text-[#38F8FF] [text-shadow:0_0_6px_rgba(56,248,255,0.8)]"
          style={{ fontFamily: FONT_HEADING, fontSize: PLATE.leader + 9, fontWeight: 700 }}
        >
          <PlateMemberLine name={leader} profiles={profiles} isLeader size={PLATE.leader + 9} />
        </span>
      ) : (
        <span
          className="flex items-center justify-center text-[#5B7A9C]"
          style={{ fontFamily: FONT_MONO, fontSize: PLATE.leader + 1, fontWeight: 600, height: (PLATE.leader + 9) * PLATE.lh }}
        >
          NO LEADER
        </span>
      )}
      {players.map((p, i) => (
        <span
          key={`${p}-${i}`}
          data-testid={`nameplate-player-${id}-${i}`}
          className="block truncate text-[#E0F2FE]"
          style={{ fontFamily: FONT_SANS, fontSize: PLATE.player + 8, fontWeight: 600 }}
        >
          <PlateMemberLine name={p} profiles={profiles} size={PLATE.player + 8} />
        </span>
      ))}
    </button>
  );
}
