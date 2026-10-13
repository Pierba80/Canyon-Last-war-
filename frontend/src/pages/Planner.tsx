import { useEffect, useRef, useState } from "react";
import { CircleHelp, Download, ImageUp, Move, RotateCcw, Route, Users } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import BattleMap from "@/components/BattleMap";
import AssignmentPanel from "@/components/AssignmentPanel";
import HelpDialog from "@/components/HelpDialog";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TEAMS, teamTitle, useMapImage, usePlanner } from "@/lib/planner";
import type { TeamId } from "@/lib/planner";
import { exportTeamPlan, fileToDataUrl } from "@/lib/mapCanvas";

function useIsDesktop() {
  const q = "(min-width: 1024px)";
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}

export default function Planner() {
  const { state, savedAt, actions } = usePlanner();
  const map = useMapImage();
  const isDesktop = useIsDesktop();
  const [team, setTeam] = useState<TeamId>("A");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const plan = state.teams[team];

  const switchTeam = (t: TeamId) => {
    setTeam(t);
    setFocusedId(null);
  };

  const onHotspotClick = (id: string) => {
    if (editMode) return;
    actions.select(team, id);
    setFocusedId(id);
    if (!isDesktop) setSheetOpen(true);
  };

  const doExport = async (t: TeamId) => {
    setExporting(true);
    const id = toast.loading(`Rendering ${teamTitle(t)} briefing…`);
    try {
      const r = await exportTeamPlan({ team: t, imageSrc: map.src, hotspots: state.hotspots, plan: state.teams[t], showArrows: state.showArrows });
      toast.success(`${teamTitle(t)} exported (${r.width}×${r.height})`, { id });
    } catch {
      toast.error("Export failed — try a different map image", { id });
    } finally {
      setExporting(false);
    }
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      const saved = map.replace(url);
      if (saved) toast.success("Map replaced for both teams");
      else toast.warning("Map replaced, but it is too large to save — it will reset on reload");
    } catch {
      toast.error("Could not read that image");
    }
  };

  const panel = <AssignmentPanel team={team} plan={plan} focusedId={focusedId} onFocus={(id) => { setFocusedId(id); if (!id && !isDesktop) setSheetOpen(false); }} actions={actions} />;

  return (
    <div className="flex h-dvh flex-col bg-[#060A12] text-[#E2F1FF]">
      <header className="relative z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#00E5FF]/25 bg-[#050D1A]/90 px-3 py-2 backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF] hud-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#7DD3FC]">Canyon // Tactical</span>
        </div>

        <div role="tablist" aria-label="Team" className="flex rounded-md border border-[#00E5FF]/25 bg-[#060A12] p-0.5" data-testid="team-tabs">
          {TEAMS.map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={team === t}
              data-testid={`team-${t.toLowerCase()}-tab`}
              onClick={() => switchTeam(t)}
              className={`relative min-h-9 rounded-[5px] px-4 font-heading text-sm font-bold tracking-wide transition-colors duration-200 ${team === t ? "text-[#031422]" : "text-[#8EA7C7] hover:text-white"}`}
            >
              {team === t && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-[5px] bg-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,0.6)]" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span className="relative">TEAM {t}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <HeaderBtn testId="edit-hotspots-btn" active={editMode} label={editMode ? "Done editing" : "Edit hotspots"} onClick={() => { setEditMode((v) => !v); setFocusedId(null); }}>
            <Move className="size-4" />
          </HeaderBtn>
          <HeaderBtn testId="toggle-arrows-btn" active={state.showArrows} label="Arrows" onClick={() => actions.setShowArrows(!state.showArrows)}>
            <Route className="size-4" />
          </HeaderBtn>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" data-testid="map-menu-btn" className="h-9 gap-1.5 px-2.5 text-[#B9D4F0] hover:bg-[#00E5FF]/10 hover:text-white" />}>
              <ImageUp className="size-4" /> <span className="hidden md:inline">Map</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="replace-map-item" onClick={() => fileRef.current?.click()}>Upload / replace map image</DropdownMenuItem>
              <DropdownMenuItem data-testid="restore-map-item" disabled={map.isDefault} onClick={() => { map.reset(); toast("Original map restored"); }}>Restore original map</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button data-testid="export-menu-btn" disabled={exporting} className="h-9 gap-1.5 px-3 shadow-[0_0_16px_rgba(0,229,255,0.35)]" />}>
              <Download className="size-4" /> <span className="hidden sm:inline">Export</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TEAMS.map((t) => (
                <DropdownMenuItem key={t} data-testid={`export-team-${t.toLowerCase()}-item`} onClick={() => doExport(t)}>
                  Export {teamTitle(t)} PNG
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="export-both-item" onClick={async () => { await doExport("A"); await doExport("B"); }}>Export both teams</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <HeaderBtn testId="help-btn" label="Help" onClick={() => setHelpOpen(true)}>
            <CircleHelp className="size-4" />
          </HeaderBtn>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="map-upload-input" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-end justify-between gap-3 px-4 pb-2 pt-3 sm:px-6">
            <motion.h1
              key={team}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              data-testid="team-title"
              className="holo-title font-heading text-3xl font-black uppercase leading-none tracking-tight sm:text-5xl"
            >
              {teamTitle(team)}
            </motion.h1>
            <p data-testid="autosave-status" className="pb-1 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[#7B96B8]">
              {savedAt ? <>Autosaved <span className="text-[#00F5A0]">{savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span></> : "Local save on"}
            </p>
          </div>
          {editMode && (
            <div data-testid="edit-mode-banner" className="mx-4 mb-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs text-amber-200 sm:mx-6">
              <Move className="size-4" />
              <span className="flex-1">Hotspot edit mode — drag the dashed zones to line them up with the buildings. Shared by both teams.</span>
              <Button size="sm" variant="ghost" data-testid="reset-hotspots-btn" className="text-amber-200 hover:bg-amber-300/15" onClick={() => { actions.resetHotspots(); toast("Hotspots reset to defaults"); }}>
                <RotateCcw className="size-3.5" /> Reset
              </Button>
              <Button size="sm" data-testid="done-editing-btn" onClick={() => setEditMode(false)}>Done</Button>
            </div>
          )}
          <div className="relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-[#00E5FF]/20 bg-[#08101E] sm:mx-4">
            <BattleMap
              imageSrc={map.src}
              hotspots={state.hotspots}
              plan={plan}
              focusedId={focusedId}
              editMode={editMode}
              showArrows={state.showArrows}
              onHotspotClick={onHotspotClick}
              onHotspotMove={actions.moveHotspot}
              onBackgroundClick={() => isDesktop && setFocusedId(null)}
            />
            {!isDesktop && (
              <Button
                data-testid="open-assignments-btn"
                onClick={() => setSheetOpen(true)}
                className="absolute bottom-3 left-1/2 z-30 h-11 -translate-x-1/2 gap-2 px-5 shadow-[0_0_20px_rgba(0,229,255,0.45)]"
              >
                <Users className="size-4" /> Assignments ({plan.selected.length})
              </Button>
            )}
          </div>
        </main>

        {isDesktop && (
          <aside data-testid="assignment-panel" className="w-[380px] shrink-0 border-l border-[#00E5FF]/20 bg-[#0B1322]">
            {panel}
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" data-testid="assignment-sheet" className="h-[78dvh] border-t border-[#00E5FF]/30 bg-[#0B1322] p-0">
            <SheetTitle className="sr-only">Assignments</SheetTitle>
            {panel}
          </SheetContent>
        </Sheet>
      )}

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <Toaster richColors />
    </div>
  );
}

function HeaderBtn({ testId, label, active, onClick, children }: { testId: string; label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="ghost"
      data-testid={testId}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`h-9 gap-1.5 px-2.5 transition-colors duration-200 ${active ? "bg-[#00E5FF]/15 text-[#38F8FF]" : "text-[#B9D4F0] hover:bg-[#00E5FF]/10 hover:text-white"}`}
    >
      {children}
      <span className="hidden xl:inline">{label}</span>
    </Button>
  );
}
