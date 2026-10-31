# Waypoint: enemy patterns, version 0.2

The user requested a playable version incorporating the enemy roles discussed in this conversation: normal/group, fast, flying, resistant, splitting, bosses, and horizontal/vertical ingress. This is an original interpretation, not an exact recreation of any historical DTD version or its wave data.

Keep the existing TypeScript/Vite/Canvas architecture, 16×12 board, ten manually started waves, touch/keyboard controls, and self-contained HTML build. Work in the existing isolated cloud checkout and update the existing feature branch.

## Design decisions

- Two independent ground routes: left (0,5) → right (15,5), top (7,0) → bottom (7,11). Alternate spawn origins. Both routes and every active ground enemy must remain connected to their own exits. Reserve ground enemies' current and committed next cells.
- Enemies: normal; low-HP grouped bursts; fast; flying (straight to its assigned exit, ignores towers); resistant (immune to slowing, receives ordinary damage); splitter (two fast shards at its death position, retaining its current segment and exit); high-HP ground boss. Only defeated splitters produce shards; leaks do not. Shards do not split again.
- Four tower roles: cannon (ground single target, 20 C), mortar (ground splash, 35 C), anti-air (air only, 25 C), frost (ground slow, 30 C). All towers are ground obstacles. Preserve cannon's existing upgrade costs and 70% refund rule; each other tower has its own three levels.
- Keep starting funds 140 and lives 20. Teach one role at a time: normal, group, fast, air, boss, resistant, splitter, ground mix, air/ground mix, final mixed bosses. Show the upcoming enemies and a practical counter hint before starting each wave. Include a concise enemy field guide.
- Distinct original colors/shapes and two route colors identify roles without copied art. Highlight slowed enemies and show selected tower targeting/effect. Hover preview uses the chosen tower's cost and range.

Reverse BFS remains the simplest ground routing implementation: maintain one distance map per exit. A shared exit map would misroute vertical enemies; a larger pathfinding framework is unnecessary. Adding more enemy labels without usable counters would not meet the requested strategic change.

## Acceptance

Tests must establish independent route safety, air bypass and target filtering, slow/immunity/expiration, real splash damage, burst timing, splitting exactly once including the last queued enemy and leaks, refunds for all tower roles, wave forecasts matching actual spawns, and victory with starting/earned funds. Validate desktop and mobile portrait/landscape, plus the standalone HTML with all external requests blocked. Actual iPhone Safari and public hosting remain outside current verification; do not imply either was tested or deployed.
