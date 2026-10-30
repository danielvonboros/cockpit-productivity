import type { ThemeSetting } from '../themes';

export type Id = string;
/** Local calendar day, YYYY-MM-DD */
export type LocalDate = string;
/** ISO 8601 */
export type Timestamp = string;

// ── Tasks ──────────────────────────────────────────

export type TaskList = 'today' | 'later';

export interface Step {
  id: Id;
  title: string;
  done: boolean;
}

export interface Task {
  id: Id;
  title: string;
  list: TaskList;
  done: boolean;
  doneAt?: Timestamp;
  /** Small next actions, so a big task never has to be started as a whole */
  steps: Step[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Notes & bookmarks ──────────────────────────────

export interface Note {
  id: Id;
  /** First line doubles as the title */
  body: string;
  pinned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Cell on the hexagon grid, axial coordinates */
export interface Hex {
  q: number;
  r: number;
}

export interface BookmarkLink {
  kind: 'link';
  id: Id;
  title: string;
  url: string;
  pos: Hex;
}

/** Like an iPhone folder: holds links on its own hexagon grid, never other folders */
export interface BookmarkFolder {
  kind: 'folder';
  id: Id;
  name: string;
  pos: Hex;
  items: BookmarkLink[];
}

export type BookmarkNode = BookmarkLink | BookmarkFolder;

// ── Pomodoro ───────────────────────────────────────

export type PomodoroMode = 'focus' | 'short' | 'long';
export type PomodoroStatus = 'idle' | 'running' | 'paused';

export interface PomodoroSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  /** A long break follows every n-th focus session */
  longEvery: number;
  autoStartBreaks: boolean;
  sound: boolean;
  notify: boolean;
}

export interface PomodoroState {
  mode: PomodoroMode;
  status: PomodoroStatus;
  /** Epoch ms; only set while running, so every tab computes the same remaining time */
  endsAt?: number;
  /** Remaining time while idle or paused */
  remainingMs: number;
  /** Planned length of the current phase, including ± adjustments */
  sessionMs: number;
  /** Focus sessions finished in the current cycle */
  cycleDone: number;
}

export interface DayStats {
  tasksDone: number;
  focusMinutes: number;
  sessions: number;
}

// ── Layout & settings ──────────────────────────────

export type TileId = 'clock' | 'pomodoro' | 'tasks' | 'notes' | 'bookmarks';

/** Grid fields a tile covers: 1 = 1×1, 2 = 2×1, 4 = 2×2, 8 = 4×2 (columns capped by screen width) */
export type TileSize = 1 | 2 | 4 | 8;

export interface TileConfig {
  id: TileId;
  visible: boolean;
  size: TileSize;
}

export interface Settings {
  theme: ThemeSetting;
  name: string;
  showSeconds: boolean;
  /** Shows only clock, focus and pomodoro */
  focusMode: boolean;
  layout: TileConfig[];
  pomodoro: PomodoroSettings;
}

export interface AppData {
  version: 1;
  tasks: Task[];
  notes: Note[];
  /** Top level of the bookmark space; every node has its own cell */
  bookmarks: BookmarkNode[];
  focusTaskId?: Id;
  pomodoro: PomodoroState;
  stats: Record<LocalDate, DayStats>;
  settings: Settings;
}
