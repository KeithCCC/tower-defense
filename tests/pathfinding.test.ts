import { describe, expect, it } from 'vitest';
import { distanceMap, routeFrom } from '../src/game/pathfinding';

describe('four-way paths', () => {
  it('finds a shortest cardinal route to the exit', () => {
    const d = distanceMap(4, 3, new Set(), { x: 3, y: 1 });
    const route = routeFrom({ x: 0, y: 1 }, 4, 3, d);
    expect(route).toEqual([{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }]);
  });
  it('detours around a tower without entering it', () => {
    const d = distanceMap(4, 3, new Set([5]), { x: 3, y: 1 });
    const route = routeFrom({ x: 0, y: 1 }, 4, 3, d);
    expect(route).toHaveLength(6);
    expect(route).not.toContainEqual({ x: 1, y: 1 });
    for (let i = 1; i < route.length; i++) {
      expect(Math.abs(route[i].x - route[i - 1].x) + Math.abs(route[i].y - route[i - 1].y)).toBe(1);
    }
  });
  it('returns no route for sealed or out-of-bounds starts', () => {
    const d = distanceMap(3, 3, new Set([1, 4, 7]), { x: 2, y: 1 });
    expect(routeFrom({ x: 0, y: 1 }, 3, 3, d)).toEqual([]);
    expect(routeFrom({ x: -1, y: 1 }, 3, 3, d)).toEqual([]);
    expect(routeFrom({ x: 3, y: 0 }, 3, 3, d)).toEqual([]);
  });
  it('returns no distances when the exit is blocked', () => {
    expect(distanceMap(2, 2, new Set([3]), { x: 1, y: 1 })).toEqual([-1, -1, -1, -1]);
  });
});
