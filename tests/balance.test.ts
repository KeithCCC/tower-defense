import { expect, it } from 'vitest';
import { Game } from '../src/game/model';

it('can win ten waves using only starting funds and earned rewards', () => {
  const game = new Game();
  // A small concentration of cannons, then strengthen it between waves.
  for (const x of [1, 2, 3, 4]) for (const y of [4, 6]) {
    if (game.money >= 20) game.placeTower({ x, y });
  }
  for (let wave = 1; wave <= 10; wave++) {
    for (const tower of game.towers) {
      const cost = game.statsFor(tower).upgradeCost;
      if (cost !== null && game.money >= cost) game.upgradeTower(tower.id);
    }
    expect(game.startWave().ok).toBe(true);
    game.update(90);
    expect(game.status).not.toBe('lost');
    expect(game.money).toBeGreaterThanOrEqual(0);
  }
  expect(game.status).toBe('won');
  expect(game.lives).toBeGreaterThan(0);
});
