# Canyon Tactical Planner — SPEC

Frontend-only tactical planner (no backend features; FastAPI skeleton untouched). Single route `*` → `src/pages/Planner.tsx`.

## What it does
- Two identical maps (same image, same hotspot positions) under tabs TEAM A / TEAM B; big title "CANYON TEAM A"/"CANYON TEAM B".
- Default map image: `frontend/public/canyon-map.jpg` (user's original 759x1024). Upload/replace via Map menu (shared by both teams, stored as data URL in localStorage `canyon_tactical_planner_map_v1`); "Restore original map".
- 12 structures (`src/lib/planner.ts` STRUCTURES/DEFAULT_HOTSPOTS, % coords): power_tower, virus_lab, defence_1/2, serum_1/2, warehouse_1..4, spawn_1/2.
- Click a zone → selects it for current team + opens editor (desktop right panel; mobile bottom sheet). One leader + many players (comma adds several). Nameplate (glowing blue box) renders below selected structures; click nameplate to edit.
- Name autocomplete: leader + player inputs show "Used before" chips (`collectNames`/`suggestNames` in planner.ts) from all names across BOTH teams; excludes names already on that structure; prefix matches first, max 6. Picking a player chip adds it (plus any comma names typed before it).
- Roster list: tick toggles visibility (keeps data); "Remove" in editor clears structure; "Clear team plan" with confirm dialog.
- Autosave: localStorage `canyon_tactical_planner_state_v1` = { teams: {A,B: {selected[], assignments{id:{leader,players[]}}}}, hotspots, showArrows }.
- Zoom (wheel/pinch/buttons), pan (drag), fit reset.
- Edit hotspots mode: drag zones; reset to defaults. Hotspots shared by teams.
- Optional extra holographic arrow overlay (off by default; original arrows are in the image).
- Export (canvas synthesis, `src/lib/mapCanvas.ts`): PNG ≥2400px wide with team title header, map, selected zones, nameplates. File `canyon-team-a-plan.png` / `-b-`.

## Auth
None.
