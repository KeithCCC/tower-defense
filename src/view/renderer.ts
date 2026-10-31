import type { Game } from '../game/model';
import type { Cell } from '../game/pathfinding';
import { ENEMY_TYPES, TOWER_TYPES } from '../game/definitions';
import type { TowerKind } from '../game/definitions';

export interface ViewState { selectedId: number | null; hover: Cell | null; showRoute: boolean; buildKind: TowerKind }

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
    for (const route of game.routes) {
      ctx.strokeStyle = `${game.lanes.find(l => l.id === route.lane)!.color}77`;
      ctx.lineWidth = 0.055;
      ctx.setLineDash([0.12, 0.16]);
      ctx.lineCap = 'round';
      ctx.beginPath();
      route.path.forEach((c, i) => i === 0 ? ctx.moveTo(c.x + 0.5, c.y + 0.5) : ctx.lineTo(c.x + 0.5, c.y + 0.5));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  for (const lane of game.lanes) for (const cell of [lane.entrance, lane.exit]) {
    const color = lane.color;
    ctx.fillStyle = `${color}18`;
    ctx.fillRect(cell.x, cell.y, 1, 1);
    ctx.strokeStyle = `${color}99`;
    ctx.lineWidth = 0.04;
    ctx.save(); ctx.translate(cell.x + .5, cell.y + .5);
    if (lane.id === 'vertical') ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-.25, 0); ctx.lineTo(.25, 0);
    ctx.moveTo(.05, -.2); ctx.lineTo(.25, 0); ctx.lineTo(.05, .2);
    ctx.stroke();
    ctx.restore();
  }

  const selected = game.towers.find(t => t.id === view.selectedId);
  const preview = view.hover && !game.towers.some(t => t.x === view.hover!.x && t.y === view.hover!.y) ? view.hover : null;
  if (selected || preview) {
    const cell = selected ?? preview!;
    const range = selected ? game.statsFor(selected).range : TOWER_TYPES[view.buildKind].levels[0].range;
    ctx.fillStyle = '#c3edae08';
    ctx.strokeStyle = '#c3edae36';
    ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.arc(cell.x + 0.5, cell.y + 0.5, range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (preview) {
    const valid = game.checkPlacement(preview, view.buildKind).ok;
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
    ctx.fillStyle = TOWER_TYPES[tower.kind].color;
    box(ctx, tower.x + 0.15, tower.y + 0.13, 0.7, 0.7, 0.13);
    ctx.strokeStyle = tower.level === 3 ? '#fff1ba' : '#e4efdf'; ctx.lineWidth = tower.level === 3 ? .05 : .025;
    ctx.strokeRect(tower.x + 0.24, tower.y + 0.22, 0.52, 0.52);
    ctx.fillStyle = '#29402e';
    ctx.beginPath(); ctx.arc(tower.x + 0.5, tower.y + 0.48, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(tower.x + 0.5, tower.y + 0.48); ctx.rotate(tower.angle);
    ctx.fillStyle = '#26382a';
    if (tower.kind === 'antiair') {
      box(ctx, 0, -.16, .4, .1, .02); box(ctx, 0, .06, .4, .1, .02);
    } else if (tower.kind === 'mortar') {
      ctx.fillStyle = '#3e3329'; ctx.beginPath(); ctx.arc(0, 0, .24, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f1d6a5'; ctx.lineWidth = .06; ctx.stroke();
    } else if (tower.kind === 'frost') {
      ctx.strokeStyle = '#e2fffa'; ctx.lineWidth = .05; ctx.beginPath();
      ctx.moveTo(-.24, 0); ctx.lineTo(.24, 0); ctx.moveTo(0, -.24); ctx.lineTo(0, .24); ctx.stroke();
    } else {
      box(ctx, 0, -.085, .4, .17, .025);
      ctx.fillStyle = '#e4f4d4'; ctx.fillRect(.33, -.09, .075, .18);
    }
    ctx.restore();
    for (let i = 0; i < tower.level; i++) {
      ctx.fillStyle = '#edf8df'; ctx.fillRect(tower.x + 0.3 + i * 0.15, tower.y + 0.73, 0.09, 0.035);
    }
  }

  for (const enemy of game.enemies) {
    const color = ENEMY_TYPES[enemy.kind].color;
    const size = enemy.kind === 'boss' ? .36 : enemy.kind === 'shard' ? .14 : enemy.kind === 'group' ? .19 : .23;
    ctx.save(); ctx.translate(enemy.x, enemy.y);
    if (enemy.slowTime > 0) {
      ctx.strokeStyle = '#9aeee0'; ctx.lineWidth = .025; ctx.beginPath(); ctx.arc(0, 0, size + .1, 0, Math.PI * 2); ctx.stroke();
    }
    if (enemy.kind === 'fast' || enemy.kind === 'shard') ctx.rotate(Math.PI / 4);
    if (enemy.kind === 'flying') {
      const exit = game.lanes.find(l => l.id === enemy.lane)!.exit;
      ctx.rotate(Math.atan2(exit.y + .5 - enemy.y, exit.x + .5 - enemy.x) + Math.PI / 2);
    }
    ctx.fillStyle = '#0d1312'; box(ctx, -size + 0.03, -size + 0.06, size * 2, size * 2, 0.07);
    ctx.fillStyle = color;
    if (enemy.kind === 'flying') {
      ctx.beginPath(); ctx.moveTo(-.35, .16); ctx.lineTo(0, -.28); ctx.lineTo(.35, .16); ctx.lineTo(0, .04); ctx.closePath(); ctx.fill();
    } else if (enemy.kind === 'immune') {
      ctx.beginPath(); ctx.moveTo(-.25, -.2); ctx.lineTo(.25, -.2); ctx.lineTo(.21, .16); ctx.lineTo(0, .32); ctx.lineTo(-.21, .16); ctx.closePath(); ctx.fill();
    } else if (enemy.kind === 'spawn') {
      ctx.beginPath(); ctx.arc(-.1, 0, .19, 0, Math.PI * 2); ctx.arc(.1, 0, .19, 0, Math.PI * 2); ctx.fill();
    } else box(ctx, -size, -size, size * 2, size * 2, 0.07);
    ctx.fillStyle = '#352520'; ctx.fillRect(-0.07, -0.07, 0.14, 0.14);
    if (enemy.kind === 'boss') {
      ctx.strokeStyle = '#fff0e4'; ctx.lineWidth = .04; ctx.strokeRect(-.24, -.24, .48, .48);
    }
    ctx.restore();
    ctx.fillStyle = '#0c1210'; ctx.fillRect(enemy.x - 0.3, enemy.y - size - 0.18, 0.6, 0.07);
    ctx.fillStyle = color; ctx.fillRect(enemy.x - 0.3, enemy.y - size - 0.18, 0.6 * Math.max(0, enemy.hp / enemy.maxHp), 0.07);
  }
  for (const shot of game.shots) {
    ctx.save(); ctx.globalAlpha = shot.ttl / .12;
    ctx.strokeStyle = shot.color;
    ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.moveTo(shot.x1, shot.y1); ctx.lineTo(shot.x2, shot.y2); ctx.stroke();
    if (shot.splash > 0) { ctx.beginPath(); ctx.arc(shot.x2, shot.y2, shot.splash, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
}
