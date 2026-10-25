import { distanceMap, inBounds, routeFrom } from './pathfinding';
import type { Cell } from './pathfinding';

export const TOWER_COST = 20;
export const TOTAL_WAVES = 10;
const STEP = 1 / 60;
export interface TowerStats { damage: number; range: number; interval: number; upgradeCost: number | null }
const LEVELS: readonly TowerStats[] = [
  { damage: 10, range: 2.7, interval: 0.65, upgradeCost: 30 },
  { damage: 21, range: 3.1, interval: 0.55, upgradeCost: 50 },
  { damage: 38, range: 3.5, interval: 0.45, upgradeCost: null },
];
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
  kind: 'normal' | 'fast' | 'heavy';
}
export interface Shot { x1: number; y1: number; x2: number; y2: number; ttl: number }
export function waveInfo(wave: number): { count: number; hp: number; bonus: number; heavy: boolean } {
  return { count: 7 + wave * 2, hp: 24 + (wave - 1) * 12 + wave * wave * 1.5, bonus: 15 + wave * 2, heavy: wave % 5 === 0 };
}
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
  private spawnTimer = 0;
  private accumulator = 0;
  protected distances = distanceMap(this.width, this.height, new Set(), this.exit);
  protected nextId = 1;

  get route(): Cell[] { return routeFrom(this.entrance, this.width, this.height, this.distances); }
  get finished(): boolean { return this.status === 'won' || this.status === 'lost'; }
  statsFor(tower: Tower): TowerStats { return LEVELS[tower.level - 1]; }

  checkPlacement(cell: Cell): ActionResult {
    if (this.finished) return { ok: false, reason: 'finished' };
    if (!inBounds(cell, this.width, this.height)) return { ok: false, reason: 'bounds' };
    if ([this.entrance, this.exit].some(c => c.x === cell.x && c.y === cell.y)) return { ok: false, reason: 'portal' };
    if (this.towers.some(t => t.x === cell.x && t.y === cell.y)) return { ok: false, reason: 'occupied' };
    if (this.enemies.some(e => [e.cell, e.next].some(c => c && c.x === cell.x && c.y === cell.y))) return { ok: false, reason: 'enemy' };
    if (this.money < TOWER_COST) return { ok: false, reason: 'funds' };
    const blocked = new Set(this.towers.map(t => t.y * this.width + t.x));
    blocked.add(cell.y * this.width + cell.x);
    const candidate = distanceMap(this.width, this.height, blocked, this.exit);
    if (candidate[this.entrance.y * this.width + this.entrance.x] < 0) return { ok: false, reason: 'blocked' };
    if (this.enemies.some(e => candidate[e.cell.y * this.width + e.cell.x] < 0
      || (e.next && candidate[e.next.y * this.width + e.next.x] < 0))) return { ok: false, reason: 'blocked' };
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
    this.remainingToSpawn = waveInfo(this.wave).count;
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
    const kind = info.heavy && this.remainingToSpawn === 1 ? 'heavy' : this.spawned % 4 === 3 ? 'fast' : 'normal';
    const hp = info.hp * (kind === 'heavy' ? 3 : kind === 'fast' ? 0.7 : 1);
    this.enemies.push({
      id: this.nextId++, cell: { ...this.entrance }, next: null, progress: 0,
      x: this.entrance.x + 0.5, y: this.entrance.y + 0.5,
      hp, maxHp: hp, speed: kind === 'heavy' ? 0.85 : kind === 'fast' ? 1.8 + this.wave * 0.04 : 1.25 + this.wave * 0.025,
      reward: (5 + Math.floor(this.wave / 3)) * (kind === 'heavy' ? 4 : 1), kind,
    });
    this.spawned++;
    this.remainingToSpawn--;
  }

  private tick(dt: number): void {
    this.shots = this.shots.filter(shot => (shot.ttl -= dt) > 0);
    this.spawnTimer -= dt;
    if (this.remainingToSpawn > 0 && this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer += 0.65;
    }

    for (const tower of this.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      if (tower.cooldown > 0) continue;
      const stats = this.statsFor(tower);
      // Prefer the enemy nearest the exit, including its progress along a segment.
      let target: Enemy | undefined;
      let remaining = Infinity;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || Math.hypot(enemy.x - tower.x - 0.5, enemy.y - tower.y - 0.5) > stats.range) continue;
        const distance = this.distances[enemy.cell.y * this.width + enemy.cell.x] - enemy.progress;
        if (distance < remaining) { target = enemy; remaining = distance; }
      }
      if (!target) continue;
      tower.angle = Math.atan2(target.y - tower.y - 0.5, target.x - tower.x - 0.5);
      target.hp -= stats.damage;
      tower.cooldown = stats.interval;
      this.shots.push({ x1: tower.x + 0.5, y1: tower.y + 0.5, x2: target.x, y2: target.y, ttl: 0.12 });
      if (target.hp <= 0) { this.money += target.reward; this.kills++; }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);

    for (const enemy of this.enemies) {
      this.moveEnemy(enemy, enemy.speed * dt);
      if (enemy.cell.x === this.exit.x && enemy.cell.y === this.exit.y) {
        this.lives = Math.max(0, this.lives - 1);
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
    while (distance > 0) {
      // Finish the already reserved segment before consulting a new distance field.
      if (!enemy.next) enemy.next = routeFrom(enemy.cell, this.width, this.height, this.distances)[1] ?? null;
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
}
