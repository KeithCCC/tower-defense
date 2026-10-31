import type { Cell } from '../game/pathfinding';

export function cellAt(
  clientX: number, clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  width: number, height: number,
): Cell | null {
  if (rect.width <= 0 || rect.height <= 0 || clientX < rect.left || clientY < rect.top
    || clientX >= rect.left + rect.width || clientY >= rect.top + rect.height) return null;
  return { x: Math.floor((clientX - rect.left) / rect.width * width), y: Math.floor((clientY - rect.top) / rect.height * height) };
}
