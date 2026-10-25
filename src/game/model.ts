import { distanceMap, inBounds, routeFrom } from './pathfinding';
import type { Cell } from './pathfinding';

export const TOWER_COST = 20;
export interface Tower extends Cell {
  id: number;
  level: number;
  spent: number;
  cooldown: number;
  angle: number;
}
export type ActionResult = { ok: true; towerId?: number } | { ok: false; reason: 'bounds' | 'portal' | 'occupied' | 'enemy' | 'blocked' | 'funds' | 'finished' | 'missing' | 'max' | 'busy' };

export class Game {
  readonly width = 16;
  readonly height = 12;
  readonly entrance: Cell = { x: 0, y: 5 };
  readonly exit: Cell = { x: 15, y: 5 };
  money = 140;
  towers: Tower[] = [];
  protected distances = distanceMap(this.width, this.height, new Set(), this.exit);
  protected nextId = 1;

  get route(): Cell[] { return routeFrom(this.entrance, this.width, this.height, this.distances); }

  checkPlacement(cell: Cell): ActionResult {
    if (!inBounds(cell, this.width, this.height)) return { ok: false, reason: 'bounds' };
    if ([this.entrance, this.exit].some(c => c.x === cell.x && c.y === cell.y)) return { ok: false, reason: 'portal' };
    if (this.towers.some(t => t.x === cell.x && t.y === cell.y)) return { ok: false, reason: 'occupied' };
    if (this.money < TOWER_COST) return { ok: false, reason: 'funds' };
    const blocked = new Set(this.towers.map(t => t.y * this.width + t.x));
    blocked.add(cell.y * this.width + cell.x);
    const candidate = distanceMap(this.width, this.height, blocked, this.exit);
    if (candidate[this.entrance.y * this.width + this.entrance.x] < 0) return { ok: false, reason: 'blocked' };
    return { ok: true };
  }

  placeTower(cell: Cell): ActionResult {
    const result = this.checkPlacement(cell);
    if (!result.ok) return result;
    const tower: Tower = { ...cell, id: this.nextId++, level: 1, spent: TOWER_COST, cooldown: 0, angle: -Math.PI / 2 };
    this.towers.push(tower);
    this.money -= TOWER_COST;
    this.recalculate();
    return { ok: true, towerId: tower.id };
  }

  protected recalculate(): void {
    this.distances = distanceMap(this.width, this.height, new Set(this.towers.map(t => t.y * this.width + t.x)), this.exit);
  }
}
