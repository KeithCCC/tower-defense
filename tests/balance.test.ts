import { expect, it } from 'vitest';
import { Game } from '../src/game/model';
import type { TowerKind } from '../src/game/definitions';

it('can win ten waves using only starting funds and earned rewards', () => {
  const game = new Game();
  // A cross-road defense, with counters bought before their first relevant wave.
  for (const x of [6, 8]) for (const y of [4, 6]) expect(game.placeTower({ x, y }).ok).toBe(true);
  expect(game.placeTower({ x: 7, y: 4 }, 'frost').ok).toBe(true);
  const upgrade = (kind: TowerKind, times = 1): void => {
    for (let i = 0; i < times; i++) for (const tower of game.towers.filter(t => t.kind === kind)) {
      const cost = game.statsFor(tower).upgradeCost;
      if (cost !== null && game.money >= cost) game.upgradeTower(tower.id);
    }
  };
  for (let wave = 1; wave <= 10; wave++) {
    if (wave === 2) expect(game.placeTower({ x: 7, y: 6 }, 'mortar').ok).toBe(true);
    if (wave === 3) upgrade('cannon');
    if (wave === 4) {
      for (const x of [6, 8]) expect(game.placeTower({ x, y: 5 }, 'antiair').ok).toBe(true);
      upgrade('antiair');
    }
    if (wave === 5 || wave === 6 || wave === 8 || wave === 10) upgrade('cannon', 2);
    if (wave === 7 || wave === 8) { upgrade('mortar', 2); upgrade('frost'); }
    if (wave === 9 || wave === 10) upgrade('antiair', 2);
    expect(game.startWave().ok).toBe(true);
    game.update(90);
    expect(game.status, `wave ${wave}, money ${game.money}, lives ${game.lives}`).not.toBe('lost');
    expect(game.money).toBeGreaterThanOrEqual(0);
  }
  expect(game.status).toBe('won');
  expect(game.lives).toBeGreaterThan(0);
});
