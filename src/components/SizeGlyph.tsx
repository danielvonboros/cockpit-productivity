import type { TileSize } from '../types/models';
import { TILE_SHAPES } from '../lib/tiles';

/** Tiny 4×2 field map with the fields a tile size covers filled in */
export function SizeGlyph({ size }: { size: TileSize }) {
  const { cols, rows } = TILE_SHAPES[size];
  const cells = [];
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      cells.push(
        <rect
          key={`${row}-${col}`}
          className={col < cols && row < rows ? 'on' : undefined}
          x={col * 5}
          y={row * 5}
          width="4"
          height="4"
          rx="1"
        />,
      );
    }
  }
  return (
    <svg className="size-glyph" width="19" height="9" viewBox="0 0 19 9" aria-hidden="true">
      {cells}
    </svg>
  );
}
