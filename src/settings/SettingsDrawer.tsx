import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PomodoroSettings, TileId } from '../types/models';
import {
  exportJson, importJson, resetData, shiftTile, updatePomodoroSettings, updateSettings, updateTile, useAppData,
} from '../data/store';
import { THEMES, type ThemeSetting } from '../themes';
import { toLocalDate } from '../lib/dates';
import { chime, notificationsSupported, requestNotifications, unlockAudio } from '../lib/signals';
import { useToast } from '../hooks/useToast';
import { Icon } from '../components/Icon';

const TILE_LABELS: Record<TileId, string> = {
  clock: 'Uhr & Fokus',
  pomodoro: 'Pomodoro',
  tasks: 'Aufgaben',
  notes: 'Notizen',
  bookmarks: 'Lesezeichen',
};

const THEME_OPTIONS: { id: ThemeSetting; label: string; description: string; swatches: readonly string[] }[] = [
  ...THEMES,
  {
    id: 'auto',
    label: 'Automatisch',
    description: 'Folgt dem System: Orbit oder Paper',
    swatches: [THEMES[0].swatches[0], THEMES[0].swatches[2], THEMES[2].swatches[0], THEMES[2].swatches[2]],
  },
];

export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const { settings } = useAppData();
  const toast = useToast();
  const closeButton = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const exportFile = () => {
    const url = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cockpit-backup-${toLocalDate(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      importJson(await file.text());
      toast('Backup geladen', { tone: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Import fehlgeschlagen');
    }
  };

  const toggleNotify = async () => {
    if (settings.pomodoro.notify) {
      updatePomodoroSettings({ notify: false });
      return;
    }
    if (await requestNotifications()) updatePomodoroSettings({ notify: true });
    else toast('Der Browser hat Benachrichtigungen blockiert.');
  };

  const pomodoro = settings.pomodoro;
  const setPomodoro = (patch: Partial<PomodoroSettings>) => updatePomodoroSettings(patch);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Einstellungen"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer__head">
          <h2 className="label">Einstellungen</h2>
          <button ref={closeButton} type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="drawer__body">
          <section className="setting-group">
            <h3 className="sublabel">Design</h3>
            <div className="theme-grid">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className="theme-card"
                  aria-pressed={settings.theme === theme.id}
                  onClick={() => updateSettings({ theme: theme.id })}
                >
                  <span className="theme-card__swatches">
                    {theme.swatches.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>
                  <span className="theme-card__name">{theme.label}</span>
                  <span className="theme-card__desc">{theme.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="setting-group">
            <h3 className="sublabel">Persönlich</h3>
            <label className="setting-row">
              <span>Name für die Begrüßung</span>
              <input
                className="field field--inline"
                value={settings.name}
                onChange={(event) => updateSettings({ name: event.target.value })}
                placeholder="optional"
              />
            </label>
            <SwitchRow label="Sekunden anzeigen" checked={settings.showSeconds} onChange={(showSeconds) => updateSettings({ showSeconds })} />
            <SwitchRow
              label="Fokusmodus"
              hint="Zeigt nur Uhr, Fokus und Pomodoro."
              checked={settings.focusMode}
              onChange={(focusMode) => updateSettings({ focusMode })}
            />
          </section>

          <section className="setting-group">
            <h3 className="sublabel">Kacheln</h3>
            <p className="hint">Reihenfolge per Pfeil oder direkt am Griff einer Kachel ziehen. „Breit“ nutzt zwei Spalten, wenn Platz ist.</p>
            <ul className="tile-rows">
              {settings.layout.map((tile, index) => (
                <li key={tile.id} className="tile-row">
                  <button
                    type="button"
                    role="switch"
                    className="switch"
                    aria-checked={tile.visible}
                    aria-label={`${TILE_LABELS[tile.id]} anzeigen`}
                    onClick={() => updateTile(tile.id, { visible: !tile.visible })}
                  />
                  <span className={`tile-row__name${tile.visible ? '' : ' is-off'}`}>{TILE_LABELS[tile.id]}</span>
                  <button
                    type="button"
                    className="chip chip--toggle"
                    aria-pressed={tile.wide}
                    onClick={() => updateTile(tile.id, { wide: !tile.wide })}
                  >
                    Breit
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    aria-label={`${TILE_LABELS[tile.id]} nach vorne`}
                    disabled={index === 0}
                    onClick={() => shiftTile(tile.id, -1)}
                  >
                    <Icon name="chevronUp" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    aria-label={`${TILE_LABELS[tile.id]} nach hinten`}
                    disabled={index === settings.layout.length - 1}
                    onClick={() => shiftTile(tile.id, 1)}
                  >
                    <Icon name="chevronDown" size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="setting-group">
            <h3 className="sublabel">Pomodoro</h3>
            <NumberRow label="Fokus" unit="min" value={pomodoro.focusMin} min={1} max={120} onChange={(focusMin) => setPomodoro({ focusMin })} />
            <NumberRow label="Kurze Pause" unit="min" value={pomodoro.shortMin} min={1} max={60} onChange={(shortMin) => setPomodoro({ shortMin })} />
            <NumberRow label="Lange Pause" unit="min" value={pomodoro.longMin} min={1} max={90} onChange={(longMin) => setPomodoro({ longMin })} />
            <NumberRow label="Lange Pause nach" unit="Runden" value={pomodoro.longEvery} min={2} max={8} onChange={(longEvery) => setPomodoro({ longEvery })} />
            <SwitchRow label="Pausen automatisch starten" checked={pomodoro.autoStartBreaks} onChange={(autoStartBreaks) => setPomodoro({ autoStartBreaks })} />
            <SwitchRow label="Ton am Ende" checked={pomodoro.sound} onChange={(sound) => setPomodoro({ sound })}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  unlockAudio();
                  chime();
                }}
              >
                Anhören
              </button>
            </SwitchRow>
            {notificationsSupported() && (
              <SwitchRow
                label="Systembenachrichtigung"
                hint="Meldet sich auch, wenn der Tab im Hintergrund ist."
                checked={pomodoro.notify}
                onChange={() => void toggleNotify()}
              />
            )}
          </section>

          <section className="setting-group">
            <h3 className="sublabel">Daten</h3>
            <p className="hint">
              Alles bleibt lokal in diesem Browser. Ein Backup bringt deine Daten in einen anderen Browser oder später in
              die Version mit Login.
            </p>
            <div className="data-actions">
              <button type="button" className="btn" onClick={exportFile}>
                <Icon name="download" size={16} />
                Exportieren
              </button>
              <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
                <Icon name="upload" size={16} />
                Importieren
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importFile(file);
                  event.target.value = '';
                }}
              />
            </div>
            <div className="data-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  if (window.confirm('Alle Aufgaben, Notizen und Lesezeichen löschen? Design und Layout bleiben.')) {
                    resetData('empty');
                    toast('Alles geleert. Frischer Start.');
                  }
                }}
              >
                Alles leeren
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  if (window.confirm('Beispieldaten laden? Deine aktuellen Einträge werden ersetzt.')) resetData('starter');
                }}
              >
                Beispiele laden
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

interface SwitchRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}

function SwitchRow({ label, hint, checked, onChange, children }: SwitchRowProps) {
  return (
    <div className="setting-row">
      <span className="setting-row__text">
        {label}
        {hint && <span className="setting-row__hint">{hint}</span>}
      </span>
      {children}
      <button type="button" role="switch" className="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
    </div>
  );
}

interface NumberRowProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** Commits only valid whole numbers, so a half-typed value never reaches the timer */
function NumberRow({ label, unit, value, min, max, onChange }: NumberRowProps) {
  const [draft, setDraft] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(String(value));
  }

  const commit = (text: string) => {
    const parsed = Number.parseInt(text, 10);
    if (Number.isNaN(parsed)) return setDraft(String(value));
    const clamped = Math.min(max, Math.max(min, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <label className="setting-row">
      <span>{label}</span>
      <span className="number-field">
        <input
          className="field"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && commit(event.currentTarget.value)}
        />
        <span className="number-field__unit">{unit}</span>
      </span>
    </label>
  );
}
