import type { ReactNode } from 'react';
import { updateTile } from '../data/store';
import { useTileSlot } from '../hooks/useTileSlot';
import { fieldLabel, nextTileSize } from '../lib/tiles';
import { Icon } from './Icon';
import { SizeGlyph } from './SizeGlyph';

interface TileProps {
  label: string;
  /** Next to the label, e.g. a count */
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Frame of every dashboard tile; the grip is picked up by the grid for drag & drop */
export function Tile({ label, meta, actions, className, children }: TileProps) {
  const slot = useTileSlot();

  return (
    <section className={`tile${className ? ` ${className}` : ''}`} aria-label={label}>
      <header className="tile__head">
        <h2 className="label">
          {label}
          {meta !== undefined && <span className="tile__meta">{meta}</span>}
        </h2>
        <div className="tile__actions">
          {actions}
          {slot && (
            <button
              type="button"
              className="tile__size"
              aria-label={`Größe ändern, jetzt ${fieldLabel(slot.size)}`}
              title={`Größe: ${fieldLabel(slot.size)} · klicken zum Ändern`}
              onClick={() => updateTile(slot.id, { size: nextTileSize(slot.size) })}
            >
              <SizeGlyph size={slot.size} />
            </button>
          )}
          <span className="tile__grip" data-drag-handle title="Kachel verschieben" aria-hidden="true">
            <Icon name="grip" size={16} />
          </span>
        </div>
      </header>
      {children}
    </section>
  );
}
