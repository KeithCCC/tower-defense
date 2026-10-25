# Maze Defense Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver a playable original maze-building tower defense and a GitHub pull request.
**Architecture:** DOM-free fixed-step simulation with a reverse BFS distance map, an independent Canvas renderer and HTML controls.
**Tech Stack:** TypeScript, Vite, HTML5 Canvas, Vitest, Playwright.
**Spec:** `docs/superpowers/specs/2026-10-26-maze-defense-design.md`

## Global Constraints
- PC and iPhone; no backend or paid services; original geometric visuals.
- One tower, ten waves, upgrades/sale; never block entry or active enemies.
- Build on the existing isolated cloud checkout; retain the Apache license.

## Review Focus
- Placement during a partially completed movement segment must not overlap or strand enemies.
- Funds, lives and rewards change exactly once; failed commands are atomic.
- Wave completion waits for both the spawn queue and remaining enemies.
- Hidden-tab elapsed time, pause and speed changes must not create catch-up bursts.
- Touch coordinates and canvas scaling remain accurate in portrait/landscape.

### Task 1: Paths and placement
Files: `src/game/pathfinding.ts`, `src/game/model.ts`, `tests/pathfinding.test.ts`, `tests/game.test.ts`.
Interfaces: `Cell {x,y}`, `distanceMap(width,height,blocked,exit): number[]`, `routeFrom(start, width, height, distances): Cell[]`; `Game.placeTower(cell): ActionResult`.
- [ ] Write failing tests for shortest path, obstruction, sealed routes, bounds and placement rules.
- [ ] Run `npm test`; confirm missing implementation failure.
- [ ] Implement BFS and placement transaction; rerun tests to green.

### Task 2: Playable simulation
Files: `src/game/model.ts`, `tests/game.test.ts`.
Interfaces: `Game.startWave()`, `Game.update(seconds)`, `Game.upgradeTower(id)`, `Game.sellTower(id)`, `Game.togglePause()`, `Game.restart()`; exported typed towers/enemies for rendering.
- [ ] Add failing tests for movement, enemy safety, combat, range/cooldown, upgrades/refunds, rewards, wave boundaries, pause, victory, defeat and restart.
- [ ] Implement deterministic simulation, rerun the complete Vitest suite.

### Task 3: Browser game
Files: `index.html`, `src/main.ts`, `src/style.css`, `src/view/renderer.ts`, `src/view/input.ts`, `tests/input.test.ts`, `playwright.config.ts`, `e2e/game.spec.ts`, `README.md`, `.github/workflows/ci.yml`.
Interfaces: `render(ctx, game, viewState)` consumes the same Game; `cellAt(clientX,clientY,rect,width,height): Cell|null` maps pointer input.
- [ ] Write and run failing coordinate and browser behavior tests.
- [ ] Implement responsive original board and controls, fixed-step loop, touch/keyboard input and status feedback.
- [ ] Run `npm test`, `npm run build`, `npm run test:e2e`; inspect desktop/mobile screenshots.
- [ ] Document rules, commands, architecture and validation limits. Save tested cloud installation/start instructions.
- [ ] Review the whole change with a fresh reviewer, fix important findings, commit, push feature branch and open a PR against `link`.
