import type { Hex } from '../types/models';

/**
 * Pointy-top hexagon grid in axial coordinates (q, r).
 * See https://www.redblobgames.com/grids/hexagons/ for the maths.
 */
export const HEX_RADIUS = 56;
export const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
export const HEX_HEIGHT = 2 * HEX_RADIUS;

const DIRECTIONS: Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const hexKey = ({ q, r }: Hex) => `${q},${r}`;
export const hexEquals = (a: Hex, b: Hex) => a.q === b.q && a.r === b.r;

export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

/** Centre of a cell in px, relative to the centre of cell (0, 0) */
export function hexToPoint({ q, r }: Hex, radius = HEX_RADIUS) {
  return { x: radius * Math.sqrt(3) * (q + r / 2), y: radius * 1.5 * r };
}

export function pointToHex(x: number, y: number, radius = HEX_RADIUS): Hex {
  const q = ((Math.sqrt(3) / 3) * x - y / 3) / radius;
  const r = ((2 / 3) * y) / radius;
  // Round in cube coordinates so the nearest cell wins
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq + 0, r: rr + 0 };
}

/** Cells from the centre outwards, ring by ring */
export function* spiral(center: Hex = { q: 0, r: 0 }): Generator<Hex> {
  yield center;
  for (let radius = 1; ; radius += 1) {
    let cell = { q: center.q + DIRECTIONS[4].q * radius, r: center.r + DIRECTIONS[4].r * radius };
    for (const direction of DIRECTIONS) {
      for (let step = 0; step < radius; step += 1) {
        yield cell;
        cell = { q: cell.q + direction.q, r: cell.r + direction.r };
      }
    }
  }
}

/** Nearest free cell to `near` (default: the centre) */
export function firstFree(occupied: Set<string>, near?: Hex): Hex {
  for (const cell of spiral(near)) if (!occupied.has(hexKey(cell))) return cell;
  throw new Error('unreachable');
}

/** Free cells within `rings` steps of any occupied cell – the visible raster around a cluster */
export function cellsAround(cells: Hex[], rings: number): Hex[] {
  if (cells.length === 0) {
    const empty: Hex[] = [];
    for (const cell of spiral()) {
      if (hexDistance(cell, { q: 0, r: 0 }) > rings) break;
      empty.push(cell);
    }
    return empty;
  }
  const taken = new Set(cells.map(hexKey));
  const result = new Map<string, Hex>();
  for (const cell of cells) {
    for (let dq = -rings; dq <= rings; dq += 1) {
      for (let dr = Math.max(-rings, -dq - rings); dr <= Math.min(rings, -dq + rings); dr += 1) {
        const next = { q: cell.q + dq, r: cell.r + dr };
        const key = hexKey(next);
        if (!taken.has(key)) result.set(key, next);
      }
    }
  }
  return [...result.values()];
}

/** SVG path of a pointy-top hexagon with softly rounded corners */
export function roundedHexPath(cx: number, cy: number, radius: number, corner: number): string {
  const corners = [0, 1, 2, 3, 4, 5].map((index) => {
    const angle = (Math.PI / 180) * (60 * index - 90);
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
  const along = (from: number[], to: number[], t: number) => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
  // A regular hexagon's side equals its radius
  const t = corner / radius;
  const f = (value: number) => value.toFixed(2);
  return (
    corners
      .map((point, index) => {
        const start = along(point, corners[(index + 5) % 6], t);
        const end = along(point, corners[(index + 1) % 6], t);
        return `${index === 0 ? 'M' : 'L'}${f(start[0])} ${f(start[1])}Q${f(point[0])} ${f(point[1])} ${f(end[0])} ${f(end[1])}`;
      })
      .join('') + 'Z'
  );
}
