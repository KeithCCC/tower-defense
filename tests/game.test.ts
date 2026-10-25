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
