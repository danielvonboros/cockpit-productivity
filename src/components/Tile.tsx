import type { ReactNode } from 'react';
import { Icon } from './Icon';

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
  return (
    <section className={`tile${className ? ` ${className}` : ''}`} aria-label={label}>
      <header className="tile__head">
        <h2 className="label">
          {label}
          {meta !== undefined && <span className="tile__meta">{meta}</span>}
        </h2>
        <div className="tile__actions">
          {actions}
          <span className="tile__grip" data-drag-handle title="Kachel verschieben" aria-hidden="true">
            <Icon name="grip" size={16} />
          </span>
        </div>
      </header>
      {children}
    </section>
  );
}
