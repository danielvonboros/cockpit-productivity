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

export interface Bookmark {
  id: Id;
  title: string;
  url: string;
}

export interface BookmarkGroup {
  id: Id;
  name: string;
  items: Bookmark[];
}

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

export interface TileConfig {
  id: TileId;
  visible: boolean;
  /** Spans two grid columns when there is room */
  wide: boolean;
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
  bookmarks: BookmarkGroup[];
  focusTaskId?: Id;
  pomodoro: PomodoroState;
  stats: Record<LocalDate, DayStats>;
  settings: Settings;
}
