# Waypoint: maze defense prototype

Build a browser-playable original maze-building tower defense for desktop and iPhone using TypeScript, Vite and Canvas, with no backend or paid services. The user's implementation request authorizes creating source files in the previously license-only checkout.

## Approach
Use a deterministic, DOM-free simulation and an independent Canvas renderer. A reverse breadth-first distance map is simpler than per-enemy A* on a 16×12 uniform grid and updates every placement or sale. A scene framework would add unnecessary dependencies; DOM rendering would depart from the requested Canvas stack. These are implementation defaults chosen by the builder.

## Rules and controls
- One entrance on the left and one exit on the right, four-way movement, no diagonal movement.
- One original geometric cannon type. Placement costs 20; starting funds 140; life 20. Two upgrades cost 30 and 50. Selling refunds 70% of total spending, rounded down.
- Ten manually triggered waves; increasing health/count, faster enemies, and heavy enemies. Kills earn funds; each cleared wave pays a bonus. Victory after wave ten is cleared; defeat at zero life. Restart restores initial state.
- Towers block movement. Reject builds on portals, occupied/outside cells, or enemy current/committed next cells. Reject any build that disconnects the entrance or an active enemy from the exit, without spending funds or changing the route.
- Fixed simulation steps; pause and 1×/2× speed. No elapsed-time catch-up after returning from background.
- Click/tap to build or select; selected tower shows range, damage, upgrade and sale. Use large HTML buttons, responsive canvas, device-pixel-ratio scaling, keyboard grid cursor and live feedback. Allow normal page scrolling on phones.
- Show the route before placement, remaining enemies, wave progress, funds, life, and clear win/loss feedback.

## Scope and validation
Separate `src/game` simulation/pathfinding, `src/view` drawing and coordinate conversion, and `src/main.ts` controls. Vitest covers paths, invalid placement atomicity, rerouting including in-flight enemies, economy, combat, waves, pause, win/loss and restart. Playwright checks desktop/mobile input, selection, rejected placement, wave combat and responsive layout with system Chromium. iPhone Safari requires a later real-device check; do not claim it was tested from Chromium emulation.

All visuals are original Canvas geometry and CSS. No copied images, sounds, logos, or trademarks. No audio, accounts, persistence, extra tower types or elaborate effects in this version.
