import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STEPS: [string, string][] = [
  ["Switch teams", "Use the TEAM A / TEAM B tabs. Each team keeps its own selections and squads."],
  ["Select structures", "Click a building on the map (or tick it in the console). Only selected structures get a nameplate."],
  ["Assign squads", "Enter one squad leader and add allied players (Enter or comma to add several). Click any nameplate to edit it."],
  ["Navigate", "Scroll or pinch to zoom, drag to pan; the zoom bar under the map has − / + and Fit."],
  ["Calibrate", "Turn on Edit layout to drag zones onto the buildings and move nameplates so they never hide map labels. Reset restores defaults."],
  ["Map & export", "Replace map uploads a new image for both teams. Export saves a high-res PNG with the team title and nameplates, or prints a roster sheet (save as PDF from the print dialog)."],
  ["Battle & reserves", "Click the countdown to set the shared battle time (optionally weekly). Each team has its own Reserves screen next to Map."],
  ["Avoid double-booking", "Members placed on two buildings (in either team) are flagged in red in the console and editor."],
];

export default function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="help-dialog" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase tracking-tight">Field manual</DialogTitle>
          <DialogDescription>Everything saves automatically in this browser.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="mt-0.5 font-mono text-xs text-[#00E5FF]">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-sm font-semibold text-white">{t}</p>
                <p className="text-sm text-[#8EA7C7]">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
