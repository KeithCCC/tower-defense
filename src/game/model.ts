import { distanceMap, inBounds, routeFrom } from './pathfinding';
import type { Cell } from './pathfinding';
import { ENEMY_TYPES, LANES, TOWER_TYPES, TOTAL_WAVES, waveInfo } from './definitions';
import type { EnemyKind, LaneId, TowerKind, TowerStats } from './definitions';
export { TOTAL_WAVES, waveInfo } from './definitions';

export const TOWER_COST = 20;
const STEP = 1 / 60;
export interface Enemy {
  id: number;
  cell: Cell;
  next: Cell | null;
  progress: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  kind: EnemyKind;
  lane: LaneId;
  slowTime: number;
  slowFactor: number;
}
export interface Shot { x1: number; y1: number; x2: number; y2: number; ttl: number; color: string; splash: number }

export function createEnemy(kind: EnemyKind, lane: LaneId, wave: number, id: number): Enemy {
  const origin = LANES.find(l => l.id === lane)!.entrance;
  const definition = ENEMY_TYPES[kind];
  const hp = waveInfo(wave).hp * definition.hp;
  return {
    id, kind, lane, cell: { ...origin }, next: null, progress: 0,
    x: origin.x + .5, y: origin.y + .5, hp, maxHp: hp,
    speed: definition.speed + Math.max(0, wave - 1) * .025,
    reward: definition.reward + Math.floor(wave / 3), slowTime: 0, slowFactor: 1,
  };
}
export interface Tower extends Cell {
  id: number;
  level: number;
  spent: number;
  cooldown: number;
  angle: number;
  kind: TowerKind;
}
export type ActionResult = { ok: true; towerId?: number } | { ok: false; reason: 'bounds' | 'portal' | 'occupied' | 'enemy' | 'blocked' | 'funds' | 'finished' | 'missing' | 'max' | 'busy' };

export class Game {
  readonly width = 16;
  readonly height = 12;
  readonly lanes = LANES;
  readonly entrance: Cell = { x: 0, y: 5 };
  readonly exit: Cell = { x: 15, y: 5 };
  money = 140;
  lives = 20;
  wave = 0;
  kills = 0;
  status: 'planning' | 'running' | 'won' | 'lost' = 'planning';
  paused = false;
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  remainingToSpawn = 0;
  spawned = 0;
  resolved = 0;
  waveTotal = 0;
  private spawnTimer = 0;
  private accumulator = 0;
  protected distances = this.distanceFields(new Set());
  protected nextId = 1;

  get route(): Cell[] { return this.routes[0].path; }
  get routes(): { lane: LaneId; path: Cell[] }[] {
    return this.lanes.map(lane => ({ lane: lane.id, path: routeFrom(lane.entrance, this.width, this.height, this.distances[lane.id]) }));
  }
  get finished(): boolean { return this.status === 'won' || this.status === 'lost'; }
  statsFor(tower: Tower): TowerStats { return TOWER_TYPES[tower.kind].levels[tower.level - 1]; }

  checkPlacement(cell: Cell, kind: TowerKind = 'cannon'): ActionResult {
    if (this.finished) return { ok: false, reason: 'finished' };
    if (!inBounds(cell, this.width, this.height)) return { ok: false, reason: 'bounds' };
    if (this.lanes.some(l => [l.entrance, l.exit].some(c => c.x === cell.x && c.y === cell.y))) return { ok: false, reason: 'portal' };
    if (this.towers.some(t => t.x === cell.x && t.y === cell.y)) return { ok: false, reason: 'occupied' };
    if (this.enemies.some(e => e.kind !== 'flying' && [e.cell, e.next].some(c => c && c.x === cell.x && c.y === cell.y))) return { ok: false, reason: 'enemy' };
    if (this.money < TOWER_TYPES[kind].cost) return { ok: false, reason: 'funds' };
    const blocked = new Set(this.towers.map(t => t.y * this.width + t.x));
    blocked.add(cell.y * this.width + cell.x);
    const candidate = this.distanceFields(blocked);
    if (this.lanes.some(l => candidate[l.id][l.entrance.y * this.width + l.entrance.x] < 0)) return { ok: false, reason: 'blocked' };
    if (this.enemies.some(e => e.kind !== 'flying' && (candidate[e.lane][e.cell.y * this.width + e.cell.x] < 0
      || (e.next && candidate[e.lane][e.next.y * this.width + e.next.x] < 0)))) return { ok: false, reason: 'blocked' };
    return { ok: true };
  }

  placeTower(cell: Cell, kind: TowerKind = 'cannon'): ActionResult {
    const result = this.checkPlacement(cell, kind);
    if (!result.ok) return result;
    const cost = TOWER_TYPES[kind].cost;
    const tower: Tower = { ...cell, kind, id: this.nextId++, level: 1, spent: cost, cooldown: 0, angle: -Math.PI / 2 };
    this.towers.push(tower);
    this.money -= cost;
    this.recalculate();
    return { ok: true, towerId: tower.id };
  }

  protected recalculate(): void {
    this.distances = this.distanceFields(new Set(this.towers.map(t => t.y * this.width + t.x)));
  }

  private distanceFields(blocked: ReadonlySet<number>): Record<LaneId, number[]> {
    return {
      horizontal: distanceMap(this.width, this.height, blocked, this.lanes[0].exit),
      vertical: distanceMap(this.width, this.height, blocked, this.lanes[1].exit),
    };
  }

  upgradeTower(id: number): ActionResult {
    if (this.finished) return { ok: false, reason: 'finished' };
    const tower = this.towers.find(t => t.id === id);
    if (!tower) return { ok: false, reason: 'missing' };
    const cost = this.statsFor(tower).upgradeCost;
    if (cost === null) return { ok: false, reason: 'max' };
    if (this.money < cost) return { ok: false, reason: 'funds' };
    this.money -= cost;
    tower.spent += cost;
    tower.level++;
    return { ok: true };
  }

  sellTower(id: number): ActionResult {
    if (this.finished) return { ok: false, reason: 'finished' };
    const tower = this.towers.find(t => t.id === id);
    if (!tower) return { ok: false, reason: 'missing' };
    this.money += Math.floor(tower.spent * 0.7);
    this.towers = this.towers.filter(t => t.id !== id);
    this.recalculate();
    return { ok: true };
  }

  startWave(): ActionResult {
    if (this.finished) return { ok: false, reason: 'finished' };
    if (this.status === 'running') return { ok: false, reason: 'busy' };
    this.wave++;
    this.status = 'running';
    this.paused = false;
    this.spawned = 0;
    this.resolved = 0;
    this.remainingToSpawn = waveInfo(this.wave).count;
    this.waveTotal = this.remainingToSpawn;
    this.spawnTimer = 0;
    this.accumulator = 0;
    return { ok: true };
  }

  togglePause(): void {
    if (this.status === 'running') this.paused = !this.paused;
  }

  restart(): void {
    Object.assign(this, new Game());
  }

  /** Fixed steps make movement, cooldowns and spawning independent of frame rate. */
  update(seconds: number): void {
    if (this.status !== 'running' || this.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    this.accumulator += seconds;
    while (this.accumulator + 1e-10 >= STEP && this.status === 'running') {
      this.accumulator -= STEP;
      this.tick(STEP);
    }
  }

  private spawn(): void {
    const info = waveInfo(this.wave);
    const order = info.entries[this.spawned];
    this.enemies.push(createEnemy(order.kind, order.lane, this.wave, this.nextId++));
    this.spawnTimer += order.delay;
    this.spawned++;
    this.remainingToSpawn--;
  }

  private tick(dt: number): void {
    this.shots = this.shots.filter(shot => (shot.ttl -= dt) > 0);
    this.spawnTimer -= dt;
    if (this.remainingToSpawn > 0 && this.spawnTimer <= 0) {
      this.spawn();
    }

    for (const tower of this.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      if (tower.cooldown > 0) continue;
      const stats = this.statsFor(tower);
      const definition = TOWER_TYPES[tower.kind];
      // Prefer the enemy nearest the exit, including its progress along a segment.
      let target: Enemy | undefined;
      let remaining = Infinity;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || Math.hypot(enemy.x - tower.x - 0.5, enemy.y - tower.y - 0.5) > stats.range) continue;
        if ((enemy.kind === 'flying') !== (definition.target === 'air')) continue;
        const distance = this.distanceToExit(enemy);
        if (distance < remaining) { target = enemy; remaining = distance; }
      }
      if (!target) continue;
      tower.angle = Math.atan2(target.y - tower.y - 0.5, target.x - tower.x - 0.5);
      const targets = stats.splash > 0 ? this.enemies.filter(e => e.hp > 0 && e.kind !== 'flying' && Math.hypot(e.x - target!.x, e.y - target!.y) <= stats.splash) : [target];
      for (const enemy of targets) {
        enemy.hp -= stats.damage;
        if (stats.slow < 1 && enemy.kind !== 'immune') {
          enemy.slowFactor = enemy.slowTime > 0 ? Math.min(enemy.slowFactor, stats.slow) : stats.slow;
          enemy.slowTime = 1.4;
        }
      }
      tower.cooldown = stats.interval;
      this.shots.push({ x1: tower.x + 0.5, y1: tower.y + 0.5, x2: target.x, y2: target.y, ttl: 0.12, color: definition.color, splash: stats.splash });
    }
    // Resolve deaths once, then insert children before movement and wave completion.
    const children: Enemy[] = [];
    for (const enemy of this.enemies) if (enemy.hp <= 0) {
      this.money += enemy.reward; this.kills++; this.resolved++;
      if (enemy.kind === 'spawn') for (let i = 0; i < 2; i++) {
        const child = createEnemy('shard', enemy.lane, this.wave, this.nextId++);
        Object.assign(child, { cell: { ...enemy.cell }, next: enemy.next ? { ...enemy.next } : null, progress: enemy.progress, x: enemy.x, y: enemy.y });
        children.push(child); this.waveTotal++;
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    this.enemies.push(...children);

    for (const enemy of this.enemies) {
      enemy.slowTime = Math.max(0, enemy.slowTime - dt);
      if (enemy.slowTime === 0) enemy.slowFactor = 1;
      this.moveEnemy(enemy, enemy.speed * dt * enemy.slowFactor);
      const exit = this.lanes.find(l => l.id === enemy.lane)!.exit;
      if (enemy.cell.x === exit.x && enemy.cell.y === exit.y) {
        this.lives = Math.max(0, this.lives - 1);
        this.resolved++;
        enemy.hp = 0;
        if (this.lives === 0) {
          this.status = 'lost';
          this.enemies = [];
          this.shots = [];
          return;
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.remainingToSpawn === 0 && this.enemies.length === 0) {
      this.money += waveInfo(this.wave).bonus;
      this.status = this.wave === TOTAL_WAVES ? 'won' : 'planning';
      this.shots = [];
    }
  }

  private moveEnemy(enemy: Enemy, distance: number): void {
    if (enemy.kind === 'flying') {
      const exit = this.lanes.find(l => l.id === enemy.lane)!.exit;
      const dx = exit.x + .5 - enemy.x;
      const dy = exit.y + .5 - enemy.y;
      const remaining = Math.hypot(dx, dy);
      if (remaining <= distance) { enemy.x = exit.x + .5; enemy.y = exit.y + .5; enemy.cell = { ...exit }; }
      else { enemy.x += dx / remaining * distance; enemy.y += dy / remaining * distance; }
      return;
    }
    while (distance > 0) {
      // Finish the already reserved segment before consulting a new distance field.
      if (!enemy.next) enemy.next = routeFrom(enemy.cell, this.width, this.height, this.distances[enemy.lane])[1] ?? null;
      if (!enemy.next) return;
      const travel = Math.min(distance, 1 - enemy.progress);
      enemy.progress += travel;
      distance -= travel;
      enemy.x = enemy.cell.x + 0.5 + (enemy.next.x - enemy.cell.x) * enemy.progress;
      enemy.y = enemy.cell.y + 0.5 + (enemy.next.y - enemy.cell.y) * enemy.progress;
      if (enemy.progress >= 1 - 1e-10) {
        enemy.cell = enemy.next;
        enemy.next = null;
        enemy.progress = 0;
      }
    }
  }

  private distanceToExit(enemy: Enemy): number {
    if (enemy.kind !== 'flying') return this.distances[enemy.lane][enemy.cell.y * this.width + enemy.cell.x] - enemy.progress;
    const exit = this.lanes.find(l => l.id === enemy.lane)!.exit;
    return Math.hypot(exit.x + .5 - enemy.x, exit.y + .5 - enemy.y);
  }
}
