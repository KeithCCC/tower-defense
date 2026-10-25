import { describe, expect, it } from 'vitest';
import { cellAt } from '../src/view/input';

describe('pointer coordinates', () => {
  const rect = { left: 20, top: 100, width: 320, height: 240 };
  it('maps viewport coordinates to grid cells independently of pixel density', () => {
    expect(cellAt(90, 210, rect, 16, 12)).toEqual({ x: 3, y: 5 });
    expect(cellAt(339, 339, rect, 16, 12)).toEqual({ x: 15, y: 11 });
  });
  it('rejects touches outside the playable rectangle or an empty canvas', () => {
    for (const [x, y] of [[19, 100], [340, 120], [30, 340], [30, 99]]) expect(cellAt(x, y, rect, 16, 12)).toBeNull();
    expect(cellAt(20, 100, { ...rect, width: 0 }, 16, 12)).toBeNull();
  });
});
