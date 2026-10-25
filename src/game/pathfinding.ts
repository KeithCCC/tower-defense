export interface Cell { x: number; y: number }

export function inBounds(cell: Cell, width: number, height: number): boolean {
  return Number.isInteger(cell.x) && Number.isInteger(cell.y)
    && cell.x >= 0 && cell.x < width && cell.y >= 0 && cell.y < height;
}

const directions = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: -1, y: 0 }];

/** Reverse BFS: a single distance field is shared by every ground enemy. */
export function distanceMap(width: number, height: number, blocked: ReadonlySet<number>, exit: Cell): number[] {
  const distances = Array<number>(width * height).fill(-1);
  if (!inBounds(exit, width, height) || blocked.has(exit.y * width + exit.x)) return distances;
  const queue = [exit];
  distances[exit.y * width + exit.x] = 0;
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    for (const direction of directions) {
      const next = { x: cell.x + direction.x, y: cell.y + direction.y };
      const index = next.y * width + next.x;
      if (!inBounds(next, width, height) || blocked.has(index) || distances[index] !== -1) continue;
      distances[index] = distances[cell.y * width + cell.x] + 1;
      queue.push(next);
    }
  }
  return distances;
}

export function routeFrom(start: Cell, width: number, height: number, distances: readonly number[]): Cell[] {
  if (!inBounds(start, width, height) || !(distances[start.y * width + start.x] >= 0)) return [];
  const route: Cell[] = [{ ...start }];
  while (distances[route[route.length - 1].y * width + route[route.length - 1].x] > 0) {
    const cell = route[route.length - 1];
    const next = directions.map(d => ({ x: cell.x + d.x, y: cell.y + d.y }))
      .find(c => inBounds(c, width, height) && distances[c.y * width + c.x] === distances[cell.y * width + cell.x] - 1);
    if (!next) return [];
    route.push(next);
  }
  return route;
}
