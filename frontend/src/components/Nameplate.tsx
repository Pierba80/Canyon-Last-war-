import { FONT_HEADING, FONT_MONO, FONT_SANS, PLATE } from "@/lib/planner";
import type { Assignment } from "@/lib/planner";

interface Props {
  id: string;
  name: string;
  assignment: Assignment;
  x: number; // % left
  y: number; // % top
  focused: boolean;
  onClick: () => void;
}

/** Glowing nameplate on the map. Sizes are logical stage px, mirrored by the canvas export. */
export default function Nameplate({ id, name, assignment, x, y, focused, onClick }: Props) {
  const leader = assignment.leader.trim();
  const players = assignment.players.map((p) => p.trim()).filter(Boolean);
  return (
    <button
      type="button"
      data-testid={`nameplate-${id}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`np-glow absolute z-20 -translate-x-1/2 cursor-pointer text-center transition-[box-shadow,transform] duration-200 ease-out hover:scale-[1.04] ${focused ? "np-focused" : ""}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        minWidth: PLATE.minW,
        maxWidth: PLATE.maxW,
        padding: `${PLATE.padY}px ${PLATE.padX}px`,
        borderRadius: PLATE.radius,
        lineHeight: PLATE.lh,
      }}
      aria-label={`Edit ${name} assignment`}
    >
      <span
        className="block truncate uppercase text-[#7DD3FC]"
        style={{ fontFamily: FONT_MONO, fontSize: PLATE.header, fontWeight: 500 }}
      >
        {name}
      </span>
      {leader ? (
        <span
          data-testid={`nameplate-leader-${id}`}
          className="block truncate text-[#38F8FF] [text-shadow:0_0_6px_rgba(56,248,255,0.8)]"
          style={{ fontFamily: FONT_HEADING, fontSize: PLATE.leader, fontWeight: 700 }}
        >
          ★ {leader}
        </span>
      ) : (
        <span
          className="flex items-center justify-center text-[#5B7A9C]"
          style={{ fontFamily: FONT_MONO, fontSize: PLATE.leader - 2, fontWeight: 600, height: PLATE.leader * PLATE.lh }}
        >
          NO LEADER
        </span>
      )}
      {players.map((p, i) => (
        <span
          key={`${p}-${i}`}
          data-testid={`nameplate-player-${id}-${i}`}
          className="block truncate text-[#E0F2FE]"
          style={{ fontFamily: FONT_SANS, fontSize: PLATE.player, fontWeight: 500 }}
        >
          {p}
        </span>
      ))}
    </button>
  );
}
