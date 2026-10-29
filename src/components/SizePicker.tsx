import type { TileSize } from '../types/models';
import { TILE_SIZES, fieldLabel } from '../lib/tiles';
import { SizeGlyph } from './SizeGlyph';

interface SizePickerProps {
  label: string;
  value: TileSize;
  onChange: (size: TileSize) => void;
}

export function SizePicker({ label, value, onChange }: SizePickerProps) {
  return (
    <div className="size-picker" role="group" aria-label={label}>
      {TILE_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          className="size-picker__item"
          aria-pressed={size === value}
          aria-label={fieldLabel(size)}
          title={fieldLabel(size)}
          onClick={() => onChange(size)}
        >
          <SizeGlyph size={size} />
          <span>{size}</span>
        </button>
      ))}
    </div>
  );
}
