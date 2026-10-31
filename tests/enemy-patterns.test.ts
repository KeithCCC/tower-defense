import { describe, expect, it } from 'vitest';
import { Game, createEnemy } from '../src/game/model';
import { ENEMY_TYPES, TOWER_TYPES, waveInfo } from '../src/game/definitions';
import type { EnemyKind, TowerKind } from '../src/game/definitions';

function encounter(kind: EnemyKind, x = 5, y = 5): Game {
  const game = new Game();
  game.startWave();
  game.remainingToSpawn = 0;
  const enemy = createEnemy(kind, 'horizontal', 1, 100);
  Object.assign(enemy, { cell: { x, y }, next: null, progress: 0, x: x + 0.5, y: y + 0.5, hp: 1000, maxHp: 1000 });
  game.enemies = [enemy];
  return game;
}

describe('two independent ground routes', () => {
  it('shows both routes and protects all four portals', () => {
    const game = new Game();
    expect(game.routes).toHaveLength(2);
    expect(game.routes[1].path[0]).toEqual({ x: 7, y: 0 });
    expect(game.routes[1].path.at(-1)).toEqual({ x: 7, y: 11 });
    for (const cell of [{ x: 7, y: 0 }, { x: 7, y: 11 }]) expect(game.placeTower(cell)).toMatchObject({ ok: false, reason: 'portal' });
    expect(game.money).toBe(140);
  });
  it('rejects sealing only the vertical entrance while horizontal remains open', () => {
    const game = new Game();
    game.placeTower({ x: 6, y: 0 }); game.placeTower({ x: 8, y: 0 });
    const route = game.route;
    expect(game.placeTower({ x: 7, y: 1 })).toMatchObject({ ok: false, reason: 'blocked' });
    expect(game.money).toBe(100);
    expect(game.route).toEqual(route);
  });
  it('spawns both lanes and guides each ground enemy to its own exit', () => {
    const game = new Game(); game.startWave(); game.update(1);
    expect(new Set(game.enemies.map(e => e.lane))).toEqual(new Set(['horizontal', 'vertical']));
    game.update(30);
    expect(game.enemies).toHaveLength(0);
    expect(game.lives).toBe(11);
  });
});

describe('role-specific towers', () => {
  it.each(['mortar', 'antiair', 'frost'] as TowerKind[])('charges and refunds the chosen %s tower including upgrades', kind => {
    const game = new Game(); game.money = 1000;
    const result = game.placeTower({ x: 5, y: 4 }, kind);
    expect(result.ok).toBe(true);
    expect(game.towers[0].kind).toBe(kind);
    const cost = TOWER_TYPES[kind].cost;
    expect(game.money).toBe(1000 - cost);
    const upgrade = game.statsFor(game.towers[0]).upgradeCost!;
    game.upgradeTower(game.towers[0].id);
    game.sellTower(game.towers[0].id);
    expect(game.money).toBe(1000 - cost - upgrade + Math.floor((cost + upgrade) * 0.7));
  });
  it('does not accept a cannon-price budget for a mortar', () => {
    const game = new Game(); game.money = 20;
    expect(game.placeTower({ x: 5, y: 4 }, 'mortar')).toMatchObject({ ok: false, reason: 'funds' });
    expect(game.money).toBe(20);
  });
  it('cannons cannot damage airborne enemies', () => {
    const game = encounter('flying'); game.placeTower({ x: 5, y: 4 }); game.update(0.1);
    expect(game.enemies[0].hp).toBe(1000);
    expect(game.shots).toHaveLength(0);
  });
  it('anti-air damages flyers but ignores ground enemies', () => {
    for (const kind of ['normal', 'flying'] as EnemyKind[]) {
      const game = encounter(kind); game.placeTower({ x: 5, y: 4 }, 'antiair'); game.update(0.1);
      expect(game.enemies[0].hp < 1000).toBe(kind === 'flying');
    }
  });
  it('splash damages nearby ground enemies but not flyers or distant enemies', () => {
    const game = encounter('normal');
    for (const [id, kind, x] of [[101, 'normal', 6], [102, 'normal', 10], [103, 'flying', 5]] as const) {
      const enemy = createEnemy(kind, 'horizontal', 1, id);
      Object.assign(enemy, { cell: { x, y: 5 }, x: x + 0.5, y: 5.5, hp: 1000, maxHp: 1000 });
      game.enemies.push(enemy);
    }
    game.placeTower({ x: 5, y: 4 }, 'mortar'); game.update(1 / 60);
    expect(game.enemies.find(e => e.id === 100)!.hp).toBeLessThan(1000);
    expect(game.enemies.find(e => e.id === 101)!.hp).toBeLessThan(1000);
    expect(game.enemies.find(e => e.id === 102)!.hp).toBe(1000);
    expect(game.enemies.find(e => e.id === 103)!.hp).toBe(1000);
  });
  it('frost slows normal enemies, expires, and cannot slow resistant enemies', () => {
    const normal = encounter('normal'); const immune = encounter('immune');
    for (const game of [normal, immune]) { game.placeTower({ x: 5, y: 4 }, 'frost'); game.update(0.1); }
    expect(normal.enemies[0].slowTime).toBeGreaterThan(0);
    expect(immune.enemies[0].slowTime).toBe(0);
    expect(immune.enemies[0].hp).toBeLessThan(1000);
    expect(normal.enemies[0].x).toBeLessThan(immune.enemies[0].x);
    normal.sellTower(normal.towers[0].id); normal.update(2);
    expect(normal.enemies[0].slowTime).toBe(0);
  });
});

describe('enemy special behavior and wave forecasts', () => {
  it('flyers cross tower cells in a straight line and do not reserve ground cells', () => {
    const game = encounter('flying');
    expect(game.placeTower({ x: 5, y: 5 }).ok).toBe(true);
    game.update(1);
    expect(game.enemies[0].y).toBe(5.5);
    expect(game.enemies[0].x).toBeGreaterThan(6.5);
  });
  it('a splitter creates two children at its current segment with the same exit', () => {
    const game = encounter('spawn'); const parent = game.enemies[0];
    Object.assign(parent, { lane: 'vertical', cell: { x: 5, y: 5 }, next: { x: 5, y: 6 }, progress: 0.4, x: 5.5, y: 5.9, hp: 1 });
    game.placeTower({ x: 4, y: 5 });
    const funds = game.money;
    game.update(1 / 60);
    expect(game.kills).toBe(1);
    expect(game.money).toBe(funds + parent.reward);
    expect(game.enemies).toHaveLength(2);
    expect(new Set(game.enemies.map(e => e.id)).size).toBe(2);
    for (const child of game.enemies) {
      expect(child.kind).toBe('shard'); expect(child.lane).toBe('vertical');
      expect(child.cell).toEqual({ x: 5, y: 5 }); expect(child.next).toEqual({ x: 5, y: 6 });
      expect(child.x).toBe(5.5); expect(child.y).toBeGreaterThanOrEqual(5.9); expect(child.y).toBeLessThan(6);
    }
    expect(game.status).toBe('running');
    expect(game.placeTower({ x: 5, y: 6 })).toMatchObject({ ok: false, reason: 'enemy' });
    game.sellTower(game.towers[0].id); game.update(0.1);
    expect(game.kills).toBe(1); expect(game.enemies).toHaveLength(2);
  });
  it('escaped splitters cost one life and never produce children or rewards', () => {
    const game = encounter('spawn', 14, 5);
    const funds = game.money;
    game.update(3);
    expect(game.lives).toBe(19); expect(game.enemies).toHaveLength(0); expect(game.kills).toBe(0);
    expect(game.money).toBe(funds + 17); // Only the wave-clear bonus.
  });
  it('shards do not split again and wave completion waits for all children', () => {
    const game = encounter('spawn'); game.enemies[0].hp = 1;
    game.placeTower({ x: 5, y: 4 }); game.update(1 / 60);
    expect(game.status).toBe('running');
    for (const child of game.enemies) child.hp = 1;
    game.placeTower({ x: 6, y: 4 }, 'mortar'); game.update(0.1);
    expect(game.enemies).toHaveLength(0); expect(game.kills).toBe(3); expect(game.status).toBe('planning');
    const funds = game.money; game.update(1); expect(game.money).toBe(funds);
  });
  it('group waves arrive in bursts rather than regular single-file intervals', () => {
    const game = new Game(); game.wave = 1; game.startWave(); game.update(0.3);
    expect(game.enemies.length).toBeGreaterThanOrEqual(3);
    expect(game.enemies.every(e => e.kind === 'group')).toBe(true);
    expect(createEnemy('group', 'horizontal', 2, 1).maxHp).toBeLessThan(createEnemy('normal', 'horizontal', 2, 2).maxHp);
  });
  it('shows all promised enemy roles and produces the forecasted spawn roster', () => {
    const roles = new Set<string>();
    for (let wave = 1; wave <= 10; wave++) {
      const game = new Game(); game.wave = wave - 1; game.lives = 1000;
      const info = waveInfo(wave);
      for (const kind of info.kinds) { roles.add(kind); expect(ENEMY_TYPES[kind].hint.length).toBeGreaterThan(0); }
      expect(info.entries).toHaveLength(info.count);
      game.startWave(); const seen: string[] = []; let previous = 0;
      for (let i = 0; i < 2400 && game.remainingToSpawn > 0; i++) {
        game.update(1 / 60);
        if (game.spawned > previous) { seen.push(game.enemies.at(-1)!.kind); previous = game.spawned; }
      }
      expect(seen).toEqual(info.entries.map(e => e.kind));
      expect(game.remainingToSpawn).toBe(0);
    }
    for (const kind of ['normal', 'group', 'fast', 'flying', 'immune', 'spawn', 'boss']) expect(roles.has(kind)).toBe(true);
  });
});
