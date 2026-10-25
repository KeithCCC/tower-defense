import { describe, expect, it } from 'vitest';
import { Game } from '../src/game/model';

describe('tower placement', () => {
  it('spends funds and updates the route when a tower is placed', () => {
    const g = new Game();
    expect(g.placeTower({ x: 5, y: 5 }).ok).toBe(true);
    expect(g.money).toBe(120);
    expect(g.towers).toHaveLength(1);
    expect(g.route).not.toContainEqual({ x: 5, y: 5 });
    expect(g.route.length).toBeGreaterThan(16);
  });
  it('rejects portals, occupied, fractional and outside cells without spending', () => {
    const g = new Game();
    for (const c of [g.entrance, g.exit, { x: -1, y: 0 }, { x: 16, y: 0 }, { x: 1.5, y: 3 }]) {
      expect(g.placeTower(c).ok).toBe(false);
    }
    expect(g.money).toBe(140);
    g.placeTower({ x: 4, y: 4 });
    expect(g.placeTower({ x: 4, y: 4 }).ok).toBe(false);
    expect(g.money).toBe(120);
  });
  it('rejects a complete wall atomically', () => {
    const g = new Game();
    g.money = 1000;
    for (let y = 0; y < 11; y++) expect(g.placeTower({ x: 7, y }).ok).toBe(true);
    const before = { money: g.money, route: g.route, count: g.towers.length };
    expect(g.placeTower({ x: 7, y: 11 })).toMatchObject({ ok: false, reason: 'blocked' });
    expect(g.money).toBe(before.money);
    expect(g.route).toEqual(before.route);
    expect(g.towers).toHaveLength(before.count);
  });
  it('rejects unaffordable towers', () => {
    const g = new Game();
    g.money = 19;
    expect(g.placeTower({ x: 1, y: 1 })).toMatchObject({ ok: false, reason: 'funds' });
    expect(g.towers).toHaveLength(0);
    expect(g.money).toBe(19);
  });
});

function advance(g: Game, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60);
}

describe('economy', () => {
  it('upgrades damage and range, then caps levels without spending', () => {
    const g = new Game();
    g.placeTower({ x: 3, y: 3 });
    const tower = g.towers[0];
    expect(g.upgradeTower(tower.id).ok).toBe(true);
    expect(g.money).toBe(90);
    expect(g.statsFor(tower).damage).toBeGreaterThan(10);
    expect(g.statsFor(tower).range).toBeGreaterThan(2.7);
    expect(g.upgradeTower(tower.id).ok).toBe(true);
    expect(g.money).toBe(40);
    expect(g.upgradeTower(tower.id)).toMatchObject({ ok: false, reason: 'max' });
    expect(g.money).toBe(40);
  });
  it('rejects unaffordable and nonexistent upgrades', () => {
    const g = new Game();
    g.placeTower({ x: 3, y: 3 });
    g.money = 0;
    expect(g.upgradeTower(g.towers[0].id)).toMatchObject({ ok: false, reason: 'funds' });
    expect(g.towers[0].level).toBe(1);
    expect(g.upgradeTower(999).ok).toBe(false);
  });
  it('refunds 70% of total investment once and restores the short route', () => {
    const g = new Game();
    g.placeTower({ x: 6, y: 5 });
    const id = g.towers[0].id;
    g.upgradeTower(id);
    g.upgradeTower(id);
    expect(g.sellTower(id).ok).toBe(true);
    expect(g.money).toBe(110);
    expect(g.towers).toHaveLength(0);
    expect(g.route).toHaveLength(16);
    expect(g.sellTower(id).ok).toBe(false);
    expect(g.money).toBe(110);
  });
});

describe('waves and combat', () => {
  it('starts one wave at a time and spawns over time', () => {
    const g = new Game();
    expect(g.startWave().ok).toBe(true);
    expect(g.startWave()).toMatchObject({ ok: false, reason: 'busy' });
    expect(g.wave).toBe(1);
    advance(g, 0.1);
    expect(g.enemies).toHaveLength(1);
    expect(g.remainingToSpawn).toBe(8);
    advance(g, 1);
    expect(g.enemies.length).toBeGreaterThan(1);
    expect(g.status).toBe('running');
  });
  it('moves enemies along the rerouted grid without crossing a tower', () => {
    const g = new Game();
    g.placeTower({ x: 3, y: 5 });
    g.startWave();
    advance(g, 2.3);
    const enemy = g.enemies[0];
    expect(enemy.y).not.toBe(5.5);
    expect(enemy.cell).not.toEqual({ x: 3, y: 5 });
    expect(enemy.next).not.toEqual({ x: 3, y: 5 });
  });
  it('reserves both cells of an in-progress movement segment', () => {
    const g = new Game();
    g.startWave();
    advance(g, 1);
    const enemy = g.enemies[0];
    expect(enemy.next).not.toBeNull();
    const money = g.money;
    expect(g.placeTower(enemy.cell)).toMatchObject({ ok: false, reason: 'enemy' });
    expect(g.placeTower(enemy.next!)).toMatchObject({ ok: false, reason: 'enemy' });
    expect(g.money).toBe(money);
  });
  it('reroutes live enemies after a build without teleporting them', () => {
    const g = new Game();
    g.startWave();
    advance(g, 1);
    const e = g.enemies[0];
    const before = { x: e.x, y: e.y, next: e.next };
    expect(g.placeTower({ x: 4, y: 5 }).ok).toBe(true);
    g.towers[0].cooldown = 999; // Isolate movement from the tower's combat behavior.
    expect({ x: e.x, y: e.y, next: e.next }).toEqual(before);
    advance(g, 2);
    expect(e.next).not.toEqual({ x: 4, y: 5 });
    expect(e.y).not.toBe(5.5);
  });
  it('rejects a cage around a live enemy even when the entry still has a route', () => {
    const g = new Game();
    g.money = 1000;
    for (const c of [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }]) g.placeTower(c);
    for (const tower of g.towers) tower.cooldown = 999;
    g.startWave();
    advance(g, 1.1);
    // The first enemy is in the 1,5 → 2,5 segment; entry can escape above.
    expect(g.placeTower({ x: 0, y: 4 }).ok).toBe(true);
    expect(g.placeTower({ x: 0, y: 6 }).ok).toBe(true);
    // Closing the left is disallowed while an enemy occupies the cell, so let later enemies move away.
    g.enemies.splice(1);
    const e = g.enemies[0];
    e.cell = { x: 2, y: 5 }; e.next = { x: 3, y: 5 }; e.progress = 0.5; e.x = 3; e.y = 5.5;
    // Open the entry's alternate path, then enclose the segment from both ends.
    g.sellTower(g.towers.find(t => t.x === 0 && t.y === 4)!.id);
    g.placeTower({ x: 1, y: 5 });
    const money = g.money;
    expect(g.placeTower({ x: 4, y: 5 })).toMatchObject({ ok: false, reason: 'blocked' });
    expect(g.money).toBe(money);
  });
  it('waits for queued spawns even when all current enemies are killed', () => {
    const g = new Game();
    g.money = 1000;
    for (const cell of [{ x: 0, y: 4 }, { x: 1, y: 4 }, { x: 0, y: 6 }]) g.placeTower(cell);
    g.startWave();
    advance(g, 0.1);
    expect(g.enemies).toHaveLength(0);
    expect(g.remainingToSpawn).toBe(8);
    expect(g.status).toBe('running');
    expect(g.startWave().ok).toBe(false);
  });
  it('produces the same combat state with different update chunk sizes', () => {
    const a = new Game();
    const b = new Game();
    for (const g of [a, b]) { g.placeTower({ x: 2, y: 4 }); g.startWave(); }
    advance(a, 3);
    b.update(3);
    expect(b.enemies).toEqual(a.enemies);
    expect(b.money).toBe(a.money);
    expect(b.kills).toBe(a.kills);
  });
  it('damages enemies in range with cooldown and rewards a kill once', () => {
    const g = new Game();
    g.placeTower({ x: 1, y: 4 });
    g.startWave();
    advance(g, 0.1);
    const enemy = g.enemies[0];
    expect(enemy.hp).toBeLessThan(enemy.maxHp);
    const hp = enemy.hp;
    advance(g, 0.1);
    expect(enemy.hp).toBe(hp);
    advance(g, 2);
    expect(g.kills).toBeGreaterThan(0);
    expect(g.money).toBeGreaterThan(120);
    expect(g.enemies.every(e => e.hp > 0)).toBe(true);
  });
  it('does not fire at enemies outside tower range', () => {
    const g = new Game();
    g.placeTower({ x: 14, y: 0 });
    g.startWave();
    advance(g, 0.2);
    expect(g.enemies[0].hp).toBe(g.enemies[0].maxHp);
    expect(g.shots).toHaveLength(0);
  });
  it('loses one life per leak and clears only after all spawns resolve', () => {
    const g = new Game();
    g.startWave();
    advance(g, 1);
    expect(g.status).toBe('running');
    advance(g, 30);
    expect(g.lives).toBe(11);
    expect(g.status).toBe('planning');
    expect(g.money).toBe(157);
    const money = g.money;
    advance(g, 10);
    expect(g.money).toBe(money);
    expect(g.startWave().ok).toBe(true);
    expect(g.wave).toBe(2);
  });
  it('freezes simulation while paused and ignores invalid time', () => {
    const g = new Game();
    g.startWave();
    advance(g, 0.2);
    g.togglePause();
    const state = JSON.stringify(g);
    g.update(5); g.update(-1); g.update(Number.NaN); g.update(Infinity);
    expect(JSON.stringify(g)).toBe(state);
    g.togglePause();
    advance(g, 0.2);
    expect(JSON.stringify(g)).not.toBe(state);
  });
  it('ends at zero life and prevents further spending or waves', () => {
    const g = new Game();
    g.lives = 1;
    g.startWave();
    advance(g, 20);
    expect(g.status).toBe('lost');
    expect(g.lives).toBe(0);
    const money = g.money;
    expect(g.placeTower({ x: 1, y: 1 }).ok).toBe(false);
    expect(g.startWave().ok).toBe(false);
    advance(g, 10);
    expect(g.money).toBe(money);
    expect(g.lives).toBe(0);
  });
  it('can complete ten waves with a defense and does not offer an eleventh', () => {
    const g = new Game();
    g.money = 10000;
    for (let x = 1; x < 15; x++) for (const y of [4, 6]) {
      const result = g.placeTower({ x, y });
      if (result.ok) { g.upgradeTower(result.towerId!); g.upgradeTower(result.towerId!); }
    }
    for (let wave = 1; wave <= 10; wave++) {
      expect(g.startWave().ok).toBe(true);
      advance(g, 60);
      expect(g.enemies).toHaveLength(0);
    }
    expect(g.wave).toBe(10);
    expect(g.status).toBe('won');
    expect(g.lives).toBe(20);
    expect(g.kills).toBe(180);
    expect(g.startWave().ok).toBe(false);
    expect(g.placeTower({ x: 1, y: 1 }).ok).toBe(false);
  });
  it('restarts all gameplay state', () => {
    const g = new Game();
    g.placeTower({ x: 1, y: 1 });
    g.startWave(); advance(g, 2); g.togglePause();
    g.restart();
    expect(g.money).toBe(140);
    expect(g.lives).toBe(20);
    expect(g.wave).toBe(0);
    expect(g.enemies).toHaveLength(0);
    expect(g.towers).toHaveLength(0);
    expect(g.shots).toHaveLength(0);
    expect(g.paused).toBe(false);
    expect(g.status).toBe('planning');
    expect(g.route).toHaveLength(16);
  });
});
