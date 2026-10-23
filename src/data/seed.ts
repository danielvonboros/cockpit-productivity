import type { AppData, PomodoroSettings, Settings, TileConfig } from '../types/models';
import { DEFAULT_THEME } from '../themes';
import { idlePhase } from '../lib/pomodoro';

export const DEFAULT_LAYOUT: TileConfig[] = [
  { id: 'clock', visible: true, wide: true },
  { id: 'pomodoro', visible: true, wide: false },
  { id: 'tasks', visible: true, wide: false },
  { id: 'notes', visible: true, wide: false },
  { id: 'bookmarks', visible: true, wide: false },
];

export const DEFAULT_POMODORO: PomodoroSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStartBreaks: false,
  sound: true,
  notify: false,
};

export function defaultSettings(): Settings {
  return {
    theme: DEFAULT_THEME,
    name: '',
    showSeconds: true,
    focusMode: false,
    layout: DEFAULT_LAYOUT.map((tile) => ({ ...tile })),
    pomodoro: { ...DEFAULT_POMODORO },
  };
}

export function emptyData(): AppData {
  const settings = defaultSettings();
  return {
    version: 1,
    tasks: [],
    notes: [],
    bookmarks: [],
    pomodoro: idlePhase('focus', settings.pomodoro, 0),
    stats: {},
    settings,
  };
}

const WELCOME_NOTE = `Willkommen im Cockpit

Kurz erklärt:
• Aufgaben: Klick auf den Titel öffnet kleine Schritte. ◎ macht eine Aufgabe zum Fokus.
• Pomodoro: Die Mitte startet und pausiert, + und − ändern die Zeit, ↺ setzt zurück, ⏭ springt zur nächsten Phase.
• Kacheln lassen sich am Griff oben rechts verschieben. Breite, Sichtbarkeit und Design unter Einstellungen.
• Fokusmodus (oben rechts) blendet alles außer Uhr, Fokus und Timer aus.
• Alles bleibt lokal in diesem Browser. Sicherung: Einstellungen › Daten › Exportieren.`;

/** First start: a few entries that explain the dashboard by using it */
export function starterData(now: Date): AppData {
  const data = emptyData();
  const stamp = now.toISOString();
  const id = () => crypto.randomUUID();

  data.tasks = [
    {
      id: id(),
      title: 'Cockpit als neuen Tab einrichten',
      list: 'today',
      done: false,
      steps: [
        { id: id(), title: 'yarn build ausführen', done: false },
        { id: id(), title: 'chrome://extensions öffnen, Entwicklermodus an', done: false },
        { id: id(), title: '„Entpackte Erweiterung laden“ → Ordner dist', done: false },
      ],
      createdAt: stamp,
      updatedAt: stamp,
    },
    { id: id(), title: 'Eine Sache als Fokus wählen', list: 'today', done: false, steps: [], createdAt: stamp, updatedAt: stamp },
    { id: id(), title: 'Eigene Lesezeichen anlegen', list: 'later', done: false, steps: [], createdAt: stamp, updatedAt: stamp },
  ];
  data.notes = [{ id: id(), body: WELCOME_NOTE, pinned: true, createdAt: stamp, updatedAt: stamp }];
  data.bookmarks = [
    {
      id: id(),
      name: 'Start',
      items: [
        { id: id(), title: 'Claude', url: 'https://claude.ai' },
        { id: id(), title: 'GitHub', url: 'https://github.com' },
        { id: id(), title: 'Figma', url: 'https://www.figma.com' },
      ],
    },
  ];
  return data;
}
