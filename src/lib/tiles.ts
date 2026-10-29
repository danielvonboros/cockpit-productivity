import type { TileSize } from '../types/models';

export const TILE_SIZES: TileSize[] = [1, 2, 4, 8];

/** Columns × rows per size; the grid caps columns at what the screen has */
export const TILE_SHAPES: Record<TileSize, { cols: 1 | 2 | 4; rows: 1 | 2 }> = {
  1: { cols: 1, rows: 1 },
  2: { cols: 2, rows: 1 },
  4: { cols: 2, rows: 2 },
  8: { cols: 4, rows: 2 },
};

export function isTileSize(value: unknown): value is TileSize {
  return TILE_SIZES.includes(value as TileSize);
}

export function nextTileSize(size: TileSize): TileSize {
  return TILE_SIZES[(TILE_SIZES.indexOf(size) + 1) % TILE_SIZES.length];
}

export function fieldLabel(size: TileSize): string {
  return `${size} ${size === 1 ? 'Feld' : 'Felder'}`;
}
