import {
  ARROWS, FONT_HEADING, FONT_MONO, FONT_SANS, PLATE, STAGE_W, STRUCTURES, arrowGeom, plateAnchor,
  teamTitle,
} from "@/lib/planner";
import type { Assignment, Hotspot, TeamId, TeamPlan } from "@/lib/planner";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

/** Read an uploaded file, downscale to keep localStorage happy, return a JPEG data URL. */
export async function fileToDataUrl(file: File, maxSide = 2400): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface PlateLine { text: string; font: string; color: string; size: number; glow: boolean }

function plateLines(name: string, a: Assignment): PlateLine[] {
  const leader = a.leader.trim();
  const lines: PlateLine[] = [
    { text: name.toUpperCase(), font: `500 ${PLATE.header}px ${FONT_MONO}`, color: "#7DD3FC", size: PLATE.header, glow: false },
    leader
      ? { text: `★ ${leader}`, font: `700 ${PLATE.leader}px ${FONT_HEADING}`, color: "#38F8FF", size: PLATE.leader, glow: true }
      : { text: "NO LEADER", font: `600 ${PLATE.leader - 2}px ${FONT_MONO}`, color: "#5B7A9C", size: PLATE.leader, glow: false },
  ];
  for (const p of a.players) {
    const t = p.trim();
    if (t) lines.push({ text: t, font: `500 ${PLATE.player}px ${FONT_SANS}`, color: "#E0F2FE", size: PLATE.player, glow: false });
  }
  return lines;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

interface PlateBox { x: number; y: number; w: number; h: number; lines: PlateLine[] }

function layoutPlate(ctx: CanvasRenderingContext2D, ax: number, ay: number, lines: PlateLine[]): PlateBox {
  const inner = PLATE.maxW - PLATE.padX * 2;
  let w = 0;
  for (const l of lines) {
    ctx.font = l.font;
    l.text = fitText(ctx, l.text, inner);
    w = Math.max(w, ctx.measureText(l.text).width);
  }
  w = Math.min(PLATE.maxW, Math.max(PLATE.minW, w + PLATE.padX * 2));
  const h = PLATE.padY * 2 + lines.reduce((s, l) => s + l.size * PLATE.lh, 0);
  return { x: ax - w / 2, y: ay, w, h, lines };
}

const HEADER_H = 72;
const FOOTER_H = 22;

export async function exportTeamPlan(opts: {
  team: TeamId; imageSrc: string; hotspots: Record<string, Hotspot>; plan: TeamPlan; showArrows: boolean;
  battle: string | null;
}) {
  const { team, imageSrc, hotspots, plan, showArrows, battle } = opts;
  await Promise.all([
    document.fonts.load(`900 30px ${FONT_HEADING}`),
    document.fonts.load(`700 10px ${FONT_HEADING}`),
    document.fonts.load(`500 8px ${FONT_SANS}`),
    document.fonts.load(`500 7px ${FONT_MONO}`),
  ]);
  const img = await loadImage(imageSrc);
  const stageH = (STAGE_W * img.naturalHeight) / img.naturalWidth;
  const outW = Math.max(2400, img.naturalWidth);
  const k = outW / STAGE_W;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Phase 1: layout nameplates (measureText is transform-independent)
  const selected = STRUCTURES.filter((s) => plan.selected.includes(s.id) && hotspots[s.id]);
  const plates = selected.map((s) => {
    const a = plan.assignments[s.id] ?? { leader: "", players: [] };
    const anchor = plateAnchor(hotspots[s.id], s);
    return layoutPlate(ctx, (anchor.x / 100) * STAGE_W, (anchor.y / 100) * stageH, plateLines(s.name, a));
  });
  const contentH = Math.max(stageH, ...plates.map((p) => p.y + p.h + 8));
  // Reserves block below the map, word-wrapped
  const reserves = plan.reserves.map((r) => r.trim()).filter(Boolean);
  const resFont = `500 9px ${FONT_SANS}`;
  const resLines: string[] = [];
  if (reserves.length) {
    ctx.font = resFont;
    let line = "";
    for (const r of reserves) {
      const next = line ? `${line}   ·   ${r}` : r;
      if (line && ctx.measureText(next).width > STAGE_W - 40) {
        resLines.push(line);
        line = r;
      } else line = next;
    }
    if (line) resLines.push(line);
  }
  const reservesH = reserves.length ? 26 + resLines.length * 13 : 0;
  const totalH = HEADER_H + contentH + reservesH + FOOTER_H;

  canvas.width = Math.round(outW);
  canvas.height = Math.round(totalH * k);
  ctx.scale(k, k);

  // Background + header
  ctx.fillStyle = "#060A12";
  ctx.fillRect(0, 0, STAGE_W, totalH);
  const g = ctx.createLinearGradient(0, 0, 0, HEADER_H);
  g.addColorStop(0, "#050D1A");
  g.addColorStop(1, "#0B1A30");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_W, HEADER_H);
  ctx.save();
  ctx.shadowColor = "rgba(0,229,255,0.9)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#00E5FF";
  ctx.fillRect(0, HEADER_H - 1.2, STAGE_W, 1.2);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.save();
  ctx.font = `900 30px ${FONT_HEADING}`;
  ctx.shadowColor = "rgba(0,229,255,0.85)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#E2F9FF";
  ctx.fillText(teamTitle(team), STAGE_W / 2, battle ? 34 : 40);
  ctx.restore();
  if (battle) {
    ctx.save();
    ctx.font = `700 8.5px ${FONT_MONO}`;
    ctx.fillStyle = "#38F8FF";
    ctx.shadowColor = "rgba(0,229,255,0.7)";
    ctx.shadowBlur = 6;
    ctx.fillText(`BATTLE: ${battle.toUpperCase()}`, STAGE_W / 2, 48);
    ctx.restore();
  }
  ctx.font = `500 7px ${FONT_MONO}`;
  ctx.fillStyle = "#7DD3FC";
  const players = selected.reduce((n, s) => {
    const a = plan.assignments[s.id];
    return n + (a ? a.players.filter((p) => p.trim()).length + (a.leader.trim() ? 1 : 0) : 0);
  }, 0);
  ctx.fillText(
    `TACTICAL DEPLOYMENT PLAN  ·  ${selected.length} STRUCTURES  ·  ${players} OPERATIVES  ·  ${new Date().toLocaleDateString()}`,
    STAGE_W / 2, battle ? 61 : 58,
  );

  // Map
  ctx.save();
  ctx.translate(0, HEADER_H);
  ctx.drawImage(img, 0, 0, STAGE_W, stageH);

  if (showArrows) {
    for (const [f, t] of ARROWS) {
      if (!hotspots[f] || !hotspots[t]) continue;
      const a = arrowGeom(hotspots[f], hotspots[t], stageH);
      ctx.save();
      ctx.shadowColor = "rgba(0,229,255,0.9)";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = "rgba(0,229,255,0.9)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.quadraticCurveTo(a.cx, a.cy, a.x2, a.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#00E5FF";
      ctx.translate(a.x2, a.y2);
      ctx.rotate(a.angle);
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(-7, -5);
      ctx.lineTo(-7, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Selected zones
  for (const s of selected) {
    const h = hotspots[s.id];
    const x = ((h.x - h.w / 2) / 100) * STAGE_W, y = ((h.y - h.h / 2) / 100) * stageH;
    const w = (h.w / 100) * STAGE_W, hh = (h.h / 100) * stageH;
    ctx.save();
    ctx.shadowColor = "rgba(0,229,255,0.9)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(0,229,255,0.08)";
    ctx.fillRect(x, y, w, hh);
    ctx.strokeStyle = "rgba(0,229,255,0.85)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, w, hh);
    ctx.restore();
  }

  // Nameplates
  for (const p of plates) {
    ctx.save();
    ctx.shadowColor = "rgba(0,229,255,0.65)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "rgba(0,45,84,0.92)";
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, PLATE.radius);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#38F8FF";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, PLATE.radius);
    ctx.stroke();
    let cy = p.y + PLATE.padY;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const l of p.lines) {
      const lh = l.size * PLATE.lh;
      ctx.save();
      ctx.font = l.font;
      ctx.fillStyle = l.color;
      if (l.glow) {
        ctx.shadowColor = "rgba(56,248,255,0.8)";
        ctx.shadowBlur = 6;
      }
      ctx.fillText(l.text, p.x + p.w / 2, cy + lh / 2);
      ctx.restore();
      cy += lh;
    }
  }
  ctx.restore();

  if (reserves.length) {
    const top = HEADER_H + contentH;
    ctx.fillStyle = "#38F8FF";
    ctx.fillRect(20, top + 6, STAGE_W - 40, 0.6);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 7px ${FONT_MONO}`;
    ctx.fillStyle = "#7DD3FC";
    ctx.fillText(`RESERVES (${reserves.length})`, 20, top + 18);
    ctx.font = resFont;
    ctx.fillStyle = "#E0F2FE";
    resLines.forEach((l, i) => ctx.fillText(l, 20, top + 31 + i * 13));
  }

  // Footer
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = `500 6px ${FONT_MONO}`;
  ctx.fillStyle = "#4F6B8C";
  ctx.fillText(`${teamTitle(team)} // CANYON TACTICAL PLANNER`, STAGE_W - 10, totalH - FOOTER_H / 2);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Export failed");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `canyon-team-${team.toLowerCase()}-plan.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { width: canvas.width, height: canvas.height };
}
