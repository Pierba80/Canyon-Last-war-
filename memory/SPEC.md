# Canyon Tactical Planner — SPEC

Frontend-only tactical planner (no backend features; FastAPI skeleton untouched). Single route `*` → `src/pages/Planner.tsx`.

## What it does
- Two identical maps (same image, same hotspot positions) under tabs TEAM A / TEAM B; big title "CANYON TEAM A"/"CANYON TEAM B".
- Default map image: `frontend/public/canyon-map.jpg` (user's original 759x1024). Upload/replace via Map menu (shared by both teams, stored as data URL in localStorage `canyon_tactical_planner_map_v1`); "Restore original map".
- 12 structures (`src/lib/planner.ts` STRUCTURES/DEFAULT_HOTSPOTS, % coords): power_tower, virus_lab, defence_1/2, serum_1/2, warehouse_1..4, spawn_1/2.
- Click a zone → selects it for current team + opens editor (desktop right panel; mobile bottom sheet). One leader + many players (comma adds several). Nameplate (glowing blue box) renders below selected structures; click nameplate to edit.
- Name autocomplete: leader + player inputs show "Used before" chips (`collectNames`/`suggestNames` in planner.ts) from all names across BOTH teams; excludes names already on that structure; prefix matches first, max 6. Picking a player chip adds it (plus any comma names typed before it).
- Alliance members: `members[]` in state (shared by teams), edited via "Add/Edit member list" dialog (paste lines/commas, dedupe case-insensitive, "Add names already on the map"). Unassigned = members not leader/player on any SELECTED structure in Team A or B; shown in roster panel (count x/y + amber chips) and as one-tap "Unassigned" chips in the editor (when player input empty). Hidden structures don't count as assigned.
- Double-booking: `placementsByName`/`findDuplicates` (planner.ts) over SELECTED structures in both teams (case-insensitive). Roster panel shows red "Double-booked" section (chips jump to building in current team); editor shows inline "Also on Team X · Building" under leader/player; toast warning when adding a name already placed; mobile Assignments button shows red count badge.
- Roster sheet: Export menu → Print Team A / Team B / both rosters → `components/PrintRoster.tsx` (hidden on screen, `print:block`; app shell `print:hidden`), all 12 buildings, leader, players, count, ⚠ for double-booked, one page per team. Save as PDF via browser print dialog.
- Battle countdown: `state.battle = {at: 'YYYY-MM-DDTHH:mm' local | null, weekly}` shared by both teams; `lib/battle.ts` (battleStatus rolls weekly forward by calendar weeks; LIVE for 60 min after start; one-off past = ended). Chip `BattleCountdown` in title strip, click → dialog (datetime-local + weekly checkbox + clear). Battle label printed in PNG header and roster print header.
- Pre-battle reminder: `components/BattleReminder.tsx` — within 15 min (REMINDER_MS) before start: amber banner above workspace with live countdown + dismiss (per occurrence, persisted in localStorage `canyon_tactical_planner_reminder_dismissed_v1`), one-time warning toast, countdown chip turns amber "Starting soon".
- Reserves: `TeamPlan.reserves: string[]` per team; separate screen per team via Map | Reserves tabs under the title (`components/ReservesView.tsx`): add (comma, suggestions, unassigned chips), edit, remove, "Move to building" (promoteReserve → adds as player + selects building). Reserves count as assigned (not unassigned) and are included in double-booking (label "Team X · Reserves"). PNG export appends a RESERVES block; print sheet has a Reserves section.
- Autosave also flushes on pagehide/visibility hidden.
- Roster list: tick toggles visibility (keeps data); "Remove" in editor clears structure; "Clear team plan" with confirm dialog.
- Autosave: localStorage `canyon_tactical_planner_state_v1` = { teams: {A,B: {selected[], assignments{id:{leader,players[]}}}}, hotspots, showArrows }.
- Zoom (wheel/pinch/buttons), pan (drag), fit reset.
- Edit hotspots mode: drag zones; reset to defaults. Hotspots shared by teams.
- Optional extra holographic arrow overlay (off by default; original arrows are in the image).
- Export (canvas synthesis, `src/lib/mapCanvas.ts`): PNG ≥2400px wide with team title header, map, selected zones, nameplates. File `canyon-team-a-plan.png` / `-b-`.

## Auth
None.
