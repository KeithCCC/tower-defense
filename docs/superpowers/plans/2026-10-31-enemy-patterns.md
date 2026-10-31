# Enemy Patterns Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans, tests first, in the existing isolated checkout.

**Goal:** Deliver an original enemy-pattern edition with meaningful tower counters and two ground routes.
**Architecture:** Declarative tower/enemy/wave definitions; deterministic DOM-free simulation; independent renderer and HTML controls. Retain single-file builds.
**Tech Stack:** TypeScript, Vite, Canvas, Vitest, Playwright.
**Spec:** `docs/superpowers/specs/2026-10-31-enemy-patterns-design.md`

## Global Constraints
- Four tower roles, three levels each; ten waves; initial 140 C, 20 lives; 16×12 board.
- Never disconnect either ground entrance or an active ground enemy from its own exit.
- Original art; no paid service, backend, new runtime dependencies, or deployment.

## Review Focus
- Splits preserve position, reserved movement segment and assigned exit, without duplicate rewards or early wave completion.
- Air ignores walls and ground effects but is actually countered by anti-air.
- Vertical and horizontal enemies each follow and preserve their own exit connectivity.
- Type-specific cost, upgrades, refund and target filtering match the visible UI.
- Wave hints accurately describe actual enemies; portrait/landscape controls and standalone builds still work.

### Task 1: Definitions, routes and combat
Files: `src/game/definitions.ts`, `src/game/model.ts`, `tests/enemy-patterns.test.ts`, existing regression tests.
Interfaces: `TowerKind`, `EnemyKind`, `LaneId`, `TOWER_TYPES`, `ENEMY_TYPES`, `waveInfo(wave)`; `Game.placeTower(cell, kind='cannon')`, `checkPlacement(cell,kind)`, `routes`, `lanes`, `statsFor(tower)`; enemies retain lane/segment/slow state.
- [ ] Write failing tests for both routes, new towers, air, slowing/immunity, splash, split/escape semantics, bursts, forecasts and accounting.
- [ ] Implement definitions and simulation; update old tests only for deliberately changed rules (two portals, wave roster, dedicated air counters). Run full Vitest suite to green.

### Task 2: Playable controls and drawing
Files: `src/main.ts`, `src/style.css`, `src/view/renderer.ts`, `e2e/game.spec.ts`, `e2e/standalone.spec.ts`.
Interfaces: renderer consumes `ViewState.buildKind`; UI reads the same shared definitions as the simulation; no hidden browser test hooks.
- [ ] Write failing browser tests for four choices, selected costs/refunds/effects, previews and enemy forecast.
- [ ] Implement role selection, two routes, unique enemy/tower silhouettes, slow indication, forecasts, wave roster and enemy guide.
- [ ] Run tests, build and desktop/mobile E2E; inspect screenshots and isolated standalone loading.

### Task 3: Balance and delivery
Files: `tests/balance.test.ts`, `README.md`, documentation.
- [ ] Verify a concrete defense wins all ten waves using only starting/earned resources; verify cannon-only defense cannot shoot air.
- [ ] Independent whole-change review; fix important defects with regression tests; run final validation.
- [ ] Build the downloadable HTML, commit and push the feature branch, update the existing PR if GitHub access allows it. Report any access blocker and actual validation limits.
