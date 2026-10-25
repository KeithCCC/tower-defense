import type { Game } from '../game/model';
import type { Cell } from '../game/pathfinding';

export interface ViewState { selectedId: number | null; hover: Cell | null; showRoute: boolean }

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius = 0.1): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

/** Only reads the simulation. All coordinates below are measured in grid cells. */
export function render(ctx: CanvasRenderingContext2D, game: Game, view: ViewState): void {
  const canvas = ctx.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  ctx.setTransform(w / game.width, 0, 0, h / game.height, 0, 0);
  ctx.fillStyle = '#171f1d';
  ctx.fillRect(0, 0, game.width, game.height);

  for (let y = 0; y < game.height; y++) for (let x = 0; x < game.width; x++) {
    if ((x + y) % 2 === 0) { ctx.fillStyle = '#19211f'; ctx.fillRect(x, y, 1, 1); }
    ctx.strokeStyle = '#29332e';
    ctx.lineWidth = 0.018;
    ctx.strokeRect(x, y, 1, 1);
    ctx.fillStyle = '#39443b';
    ctx.fillRect(x - 0.025, y - 0.025, 0.05, 0.05);
  }

  if (view.showRoute) {
    const route = game.route;
    ctx.strokeStyle = '#8cb78a66';
    ctx.lineWidth = 0.055;
    ctx.setLineDash([0.12, 0.16]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    route.forEach((c, i) => i === 0 ? ctx.moveTo(c.x + 0.5, c.y + 0.5) : ctx.lineTo(c.x + 0.5, c.y + 0.5));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const [cell, color] of [[game.entrance, '#c3edae'], [game.exit, '#e6bb79']] as const) {
    ctx.fillStyle = `${color}18`;
    ctx.fillRect(cell.x, cell.y, 1, 1);
    ctx.strokeStyle = `${color}99`;
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(cell.x + 0.25, cell.y + 0.5); ctx.lineTo(cell.x + 0.75, cell.y + 0.5);
    ctx.moveTo(cell.x + 0.55, cell.y + 0.3); ctx.lineTo(cell.x + 0.75, cell.y + 0.5); ctx.lineTo(cell.x + 0.55, cell.y + 0.7);
    ctx.stroke();
  }

  const selected = game.towers.find(t => t.id === view.selectedId);
  const preview = view.hover && !game.towers.some(t => t.x === view.hover!.x && t.y === view.hover!.y) ? view.hover : null;
  if (selected || preview) {
    const cell = selected ?? preview!;
    const range = selected ? game.statsFor(selected).range : 2.7;
    ctx.fillStyle = '#c3edae08';
    ctx.strokeStyle = '#c3edae36';
    ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.arc(cell.x + 0.5, cell.y + 0.5, range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (preview) {
    const valid = game.checkPlacement(preview).ok;
    ctx.fillStyle = valid ? '#c3edae22' : '#f18a7c33';
    ctx.fillRect(preview.x, preview.y, 1, 1);
    ctx.strokeStyle = valid ? '#c3edae' : '#f18a7c';
    ctx.lineWidth = 0.035;
    ctx.strokeRect(preview.x + 0.1, preview.y + 0.1, 0.8, 0.8);
    ctx.fillStyle = valid ? '#c3edae55' : '#f18a7c55';
    box(ctx, preview.x + 0.29, preview.y + 0.29, 0.42, 0.42);
  }

  for (const tower of game.towers) {
    const active = tower.id === view.selectedId;
    if (active) {
      ctx.strokeStyle = '#e1f4c9'; ctx.lineWidth = 0.04;
      ctx.strokeRect(tower.x + 0.07, tower.y + 0.07, 0.86, 0.86);
    }
    ctx.fillStyle = '#0c120f'; box(ctx, tower.x + 0.15, tower.y + 0.2, 0.74, 0.74, 0.15);
    ctx.fillStyle = tower.level === 3 ? '#e7d397' : '#a9cf99';
    box(ctx, tower.x + 0.15, tower.y + 0.13, 0.7, 0.7, 0.13);
    ctx.strokeStyle = '#d8efc5'; ctx.lineWidth = 0.025;
    ctx.strokeRect(tower.x + 0.24, tower.y + 0.22, 0.52, 0.52);
    ctx.fillStyle = '#29402e';
    ctx.beginPath(); ctx.arc(tower.x + 0.5, tower.y + 0.48, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(tower.x + 0.5, tower.y + 0.48); ctx.rotate(tower.angle);
    ctx.fillStyle = '#26382a'; box(ctx, 0, -0.085, 0.4, 0.17, 0.025);
    ctx.fillStyle = '#e4f4d4'; ctx.fillRect(0.33, -0.09, 0.075, 0.18);
    ctx.restore();
    for (let i = 0; i < tower.level; i++) {
      ctx.fillStyle = '#edf8df'; ctx.fillRect(tower.x + 0.3 + i * 0.15, tower.y + 0.73, 0.09, 0.035);
    }
  }

  for (const enemy of game.enemies) {
    const color = enemy.kind === 'heavy' ? '#c49ee7' : enemy.kind === 'fast' ? '#edbd72' : '#ee8f80';
    const size = enemy.kind === 'heavy' ? 0.32 : 0.23;
    ctx.save(); ctx.translate(enemy.x, enemy.y);
    if (enemy.kind === 'fast') ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#0d1312'; box(ctx, -size + 0.03, -size + 0.06, size * 2, size * 2, 0.07);
    ctx.fillStyle = color; box(ctx, -size, -size, size * 2, size * 2, 0.07);
    ctx.fillStyle = '#352520'; ctx.fillRect(-0.07, -0.07, 0.14, 0.14);
    ctx.restore();
    ctx.fillStyle = '#0c1210'; ctx.fillRect(enemy.x - 0.3, enemy.y - size - 0.18, 0.6, 0.07);
    ctx.fillStyle = color; ctx.fillRect(enemy.x - 0.3, enemy.y - size - 0.18, 0.6 * Math.max(0, enemy.hp / enemy.maxHp), 0.07);
  }
  for (const shot of game.shots) {
    ctx.strokeStyle = `rgba(234,245,176,${shot.ttl / 0.12})`;
    ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.moveTo(shot.x1, shot.y1); ctx.lineTo(shot.x2, shot.y2); ctx.stroke();
  }
}
