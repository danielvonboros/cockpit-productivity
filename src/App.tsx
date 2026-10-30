import { useRef, useState, type ComponentType } from 'react';
import type { TileConfig, TileId } from './types/models';
import { moveTile, updateSettings, useAppData } from './data/store';
import { useTheme } from './hooks/useTheme';
import { Icon } from './components/Icon';
import { TileBoundary } from './components/TileBoundary';
import { TileSlotContext } from './hooks/useTileSlot';
import { TILE_SHAPES } from './lib/tiles';
import { TILE_DRAG_TYPE } from './lib/links';
import { ClockTile } from './tiles/ClockTile';
import { PomodoroTile } from './tiles/PomodoroTile';
import { PomodoroEngine } from './tiles/PomodoroEngine';
import { TasksTile } from './tiles/TasksTile';
import { NotesTile } from './tiles/NotesTile';
import { BookmarksTile } from './tiles/BookmarksTile';
import { SettingsDrawer } from './settings/SettingsDrawer';

const TILES: Record<TileId, { label: string; Component: ComponentType }> = {
  clock: { label: 'Uhr', Component: ClockTile },
  pomodoro: { label: 'Pomodoro', Component: PomodoroTile },
  tasks: { label: 'Aufgaben', Component: TasksTile },
  notes: { label: 'Notizen', Component: NotesTile },
  bookmarks: { label: 'Lesezeichen', Component: BookmarksTile },
};

/** What stays on screen in focus mode */
const FOCUS_TILES: TileId[] = ['clock', 'pomodoro'];

interface DragState {
  id: TileId;
  over?: TileId;
}

export default function App() {
  const { settings } = useAppData();
  useTheme(settings.theme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);

  const tiles = settings.layout.filter(
    (tile) => tile.visible && (!settings.focusMode || FOCUS_TILES.includes(tile.id)),
  );

  return (
    <div className={`app${settings.focusMode ? ' is-focus-mode' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span className="label">Cockpit</span>
        </div>
        <div className="topbar__actions">
          <button
            type="button"
            className={`btn btn--pill${settings.focusMode ? ' is-active' : ''}`}
            aria-pressed={settings.focusMode}
            onClick={() => updateSettings({ focusMode: !settings.focusMode })}
          >
            <Icon name="scan" size={16} />
            <span className="btn__text">{settings.focusMode ? 'Fokusmodus beenden' : 'Fokusmodus'}</span>
          </button>
          <button type="button" className="icon-btn" aria-label="Einstellungen" title="Einstellungen" onClick={() => setSettingsOpen(true)}>
            <Icon name="sliders" size={18} />
          </button>
        </div>
      </header>

      <main className="grid">
        {tiles.map((tile) => (
          <TileSlot key={tile.id} tile={tile} drag={drag} setDrag={setDrag} />
        ))}
        {tiles.length === 0 && (
          <div className="grid__empty">
            <p>Alle Kacheln sind ausgeblendet.</p>
            <button type="button" className="btn" onClick={() => setSettingsOpen(true)}>
              Kacheln einblenden
            </button>
          </div>
        )}
      </main>

      {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} />}
      <PomodoroEngine />
    </div>
  );
}

interface TileSlotProps {
  tile: TileConfig;
  drag: DragState | null;
  setDrag: (drag: DragState | null) => void;
}

/** Grid cell that can be dragged by the tile's grip and accepts other tiles */
function TileSlot({ tile, drag, setDrag }: TileSlotProps) {
  // Only the grip makes the slot draggable, so text selection inside tiles keeps working
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { label, Component } = TILES[tile.id];
  const isOver = drag?.over === tile.id && drag.id !== tile.id;
  const shape = TILE_SHAPES[tile.size];

  return (
    <div
      ref={ref}
      className={`slot slot--c${shape.cols} slot--r${shape.rows}${drag?.id === tile.id ? ' is-dragging' : ''}${isOver ? ' is-over' : ''}`}
      draggable={armed}
      onPointerDown={(event) => setArmed(Boolean((event.target as Element).closest('[data-drag-handle]')))}
      onPointerUp={() => setArmed(false)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(TILE_DRAG_TYPE, tile.id);
        if (ref.current) event.dataTransfer.setDragImage(ref.current, ref.current.offsetWidth - 30, 30);
        setDrag({ id: tile.id });
      }}
      onDragOver={(event) => {
        if (!drag || drag.id === tile.id) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (drag.over !== tile.id) setDrag({ ...drag, over: tile.id });
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (drag) moveTile(drag.id, tile.id);
        setDrag(null);
      }}
      onDragEnd={() => {
        setDrag(null);
        setArmed(false);
      }}
    >
      <TileSlotContext.Provider value={tile}>
        <TileBoundary label={label}>
          <Component />
        </TileBoundary>
      </TileSlotContext.Provider>
    </div>
  );
}

function Logo() {
  return (
    <svg className="brand__logo" width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="6" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <ellipse cx="16" cy="16" rx="12" ry="5" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" transform="rotate(-24 16 16)" />
      <circle cx="26.2" cy="11.5" r="1.8" fill="var(--signal)" />
    </svg>
  );
}
