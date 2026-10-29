import { useSyncExternalStore } from 'react';
import type {
  AppData, Bookmark, DayStats, Id, LocalDate, Note, PomodoroMode, PomodoroSettings, Settings, Task, TaskList,
  TileConfig, TileId,
} from '../types/models';
import { isThemeSetting } from '../themes';
import { timestampToLocalDate, toLocalDate } from '../lib/dates';
import { MAX_PHASE_MIN, MIN_PHASE_MIN, idlePhase, nextPhase, remainingMs } from '../lib/pomodoro';
import { isTileSize } from '../lib/tiles';
import { DEFAULT_LAYOUT, emptyData, starterData } from './seed';

/**
 * Local persistence. For now everything lives in localStorage of this browser;
 * for login and sync later only this module gets swapped for an API client –
 * the components only use `useAppData()` and the actions below.
 *
 * A new-tab page is usually open several times at once, so every change starts
 * from the latest saved state and other tabs pick it up via the storage event.
 */
const STORAGE_KEY = 'cockpit:data';

// ── Load & normalize ───────────────────────────────

/** Saved before tile sizes existed, when there was only a `wide` flag */
type StoredTile = Partial<TileConfig> & { id: TileId; wide?: boolean };

function mergeLayout(stored: StoredTile[] | undefined): TileConfig[] {
  // Old saves keep which tiles are visible and get the new default arrangement
  if (stored?.length && stored.every((tile) => !isTileSize(tile.size))) {
    const visible = new Map(stored.map((tile) => [tile.id, tile.visible !== false]));
    return DEFAULT_LAYOUT.map((tile) => ({ ...tile, visible: visible.get(tile.id) ?? tile.visible }));
  }

  const defaults = new Map(DEFAULT_LAYOUT.map((tile) => [tile.id, tile]));
  const seen = new Set<TileId>();
  const layout: TileConfig[] = [];
  for (const tile of stored ?? []) {
    const fallback = defaults.get(tile.id);
    if (!fallback || seen.has(tile.id)) continue;
    seen.add(tile.id);
    layout.push({
      id: tile.id,
      visible: tile.visible ?? fallback.visible,
      size: isTileSize(tile.size) ? tile.size : fallback.size,
    });
  }
  // Tiles added in a later version show up at the end
  for (const tile of DEFAULT_LAYOUT) if (!seen.has(tile.id)) layout.push({ ...tile });
  return layout;
}

/** Fills in fields added later, so old saves and imported backups keep working */
function normalize(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as AppData).tasks)) {
    throw new Error('Das sieht nicht nach Cockpit-Daten aus.');
  }
  const input = raw as Partial<AppData>;
  const base = emptyData();
  const stored: Partial<Settings> = input.settings ?? {};
  const settings: Settings = {
    ...base.settings,
    ...stored,
    theme: isThemeSetting(stored.theme) ? stored.theme : base.settings.theme,
    pomodoro: { ...base.settings.pomodoro, ...stored.pomodoro },
    layout: mergeLayout(stored.layout),
  };
  return {
    ...base,
    ...input,
    version: 1,
    tasks: (input.tasks ?? []).map((task) => ({ ...task, steps: task.steps ?? [] })),
    notes: Array.isArray(input.notes) ? input.notes : [],
    bookmarks: Array.isArray(input.bookmarks) ? input.bookmarks : [],
    stats: input.stats ?? {},
    pomodoro: input.pomodoro ?? idlePhase('focus', settings.pomodoro, 0),
    settings,
  };
}

function readStored(): AppData | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : undefined;
  } catch {
    // Unreadable or blocked storage
    return undefined;
  }
}

function persist(next: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: keep working in memory
  }
}

let data: AppData = readStored() ?? starterData(new Date());
persist(data);

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: AppData) {
  data = next;
  persist(next);
  emit();
}

/** Applies a change to the latest saved state, so edits from another tab are never overwritten */
function update(mutate: (current: AppData) => AppData) {
  const current = readStored() ?? data;
  const next = mutate(current);
  if (next !== current) commit(next);
}

window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  const fresh = readStored();
  if (!fresh) return;
  data = fresh;
  emit();
});

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, () => data);
}

export function getData(): AppData {
  return data;
}

// ── Helpers ────────────────────────────────────────

const newId = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

const EMPTY_DAY: DayStats = { tasksDone: 0, focusMinutes: 0, sessions: 0 };

export function dayStats(source: AppData, date: LocalDate): DayStats {
  return source.stats[date] ?? EMPTY_DAY;
}

function bumpStats(stats: AppData['stats'], date: LocalDate, delta: Partial<DayStats>): AppData['stats'] {
  const current = stats[date] ?? EMPTY_DAY;
  return {
    ...stats,
    [date]: {
      tasksDone: Math.max(0, current.tasksDone + (delta.tasksDone ?? 0)),
      focusMinutes: current.focusMinutes + (delta.focusMinutes ?? 0),
      sessions: current.sessions + (delta.sessions ?? 0),
    },
  };
}

function mapTask(current: AppData, taskId: Id, change: (task: Task) => Task): AppData {
  return {
    ...current,
    tasks: current.tasks.map((task) => (task.id === taskId ? { ...change(task), updatedAt: nowIso() } : task)),
  };
}

function insertAt<T>(items: T[], item: T, index: number): T[] {
  const next = [...items];
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
  return next;
}

// ── Tasks ──────────────────────────────────────────

function newTask(title: string, list: TaskList): Task {
  const stamp = nowIso();
  return { id: newId(), title: title.trim(), list, done: false, steps: [], createdAt: stamp, updatedAt: stamp };
}

export function addTask(title: string, list: TaskList) {
  update((current) => ({ ...current, tasks: [...current.tasks, newTask(title, list)] }));
}

export function renameTask(taskId: Id, title: string) {
  if (!title.trim()) return;
  update((current) => mapTask(current, taskId, (task) => ({ ...task, title: title.trim() })));
}

/** Returns true when the task is done afterwards */
export function toggleTask(taskId: Id): boolean {
  let done = false;
  update((current) => {
    const task = current.tasks.find((item) => item.id === taskId);
    if (!task) return current;
    done = !task.done;
    const stamp = nowIso();
    const statsDate = done ? toLocalDate(new Date()) : task.doneAt && timestampToLocalDate(task.doneAt);
    return {
      ...mapTask(current, taskId, (item) => ({ ...item, done, doneAt: done ? stamp : undefined })),
      stats: statsDate ? bumpStats(current.stats, statsDate, { tasksDone: done ? 1 : -1 }) : current.stats,
      focusTaskId: done && current.focusTaskId === taskId ? undefined : current.focusTaskId,
    };
  });
  return done;
}

export function moveTask(taskId: Id, list: TaskList) {
  update((current) => mapTask(current, taskId, (task) => ({ ...task, list })));
}

export function deleteTask(taskId: Id): { task: Task; index: number } | undefined {
  const index = data.tasks.findIndex((task) => task.id === taskId);
  if (index < 0) return undefined;
  const task = data.tasks[index];
  update((current) => ({
    ...current,
    tasks: current.tasks.filter((item) => item.id !== taskId),
    focusTaskId: current.focusTaskId === taskId ? undefined : current.focusTaskId,
  }));
  return { task, index };
}

export function restoreTasks(entries: { task: Task; index: number }[]) {
  update((current) => ({
    ...current,
    tasks: entries.reduce(
      (tasks, { task, index }) => (tasks.some((item) => item.id === task.id) ? tasks : insertAt(tasks, task, index)),
      current.tasks,
    ),
  }));
}

export function clearDoneTasks(): { task: Task; index: number }[] {
  const removed = data.tasks.flatMap((task, index) => (task.done ? [{ task, index }] : []));
  update((current) => ({ ...current, tasks: current.tasks.filter((task) => !task.done) }));
  return removed;
}

export function addStep(taskId: Id, title: string) {
  if (!title.trim()) return;
  update((current) =>
    mapTask(current, taskId, (task) => ({ ...task, steps: [...task.steps, { id: newId(), title: title.trim(), done: false }] })),
  );
}

export function toggleStep(taskId: Id, stepId: Id) {
  update((current) =>
    mapTask(current, taskId, (task) => ({
      ...task,
      steps: task.steps.map((step) => (step.id === stepId ? { ...step, done: !step.done } : step)),
    })),
  );
}

export function removeStep(taskId: Id, stepId: Id) {
  update((current) =>
    mapTask(current, taskId, (task) => ({ ...task, steps: task.steps.filter((step) => step.id !== stepId) })),
  );
}

export function setFocus(taskId: Id | undefined) {
  update((current) => ({
    ...current,
    focusTaskId: taskId,
    // A focus is always something for today
    tasks: taskId ? mapTask(current, taskId, (task) => ({ ...task, list: 'today' })).tasks : current.tasks,
  }));
}

export function focusNewTask(title: string) {
  if (!title.trim()) return;
  const task = newTask(title, 'today');
  update((current) => ({ ...current, tasks: [...current.tasks, task], focusTaskId: task.id }));
}

// ── Notes ──────────────────────────────────────────

export function addNote(body = ''): Id {
  const stamp = nowIso();
  const note: Note = { id: newId(), body, pinned: false, createdAt: stamp, updatedAt: stamp };
  update((current) => ({ ...current, notes: [note, ...current.notes] }));
  return note.id;
}

export function updateNote(noteId: Id, body: string) {
  update((current) => ({
    ...current,
    notes: current.notes.map((note) => (note.id === noteId ? { ...note, body, updatedAt: nowIso() } : note)),
  }));
}

export function toggleNotePin(noteId: Id) {
  update((current) => ({
    ...current,
    notes: current.notes.map((note) => (note.id === noteId ? { ...note, pinned: !note.pinned } : note)),
  }));
}

export function deleteNote(noteId: Id): { note: Note; index: number } | undefined {
  const index = data.notes.findIndex((note) => note.id === noteId);
  if (index < 0) return undefined;
  const note = data.notes[index];
  update((current) => ({ ...current, notes: current.notes.filter((item) => item.id !== noteId) }));
  return { note, index };
}

export function restoreNote({ note, index }: { note: Note; index: number }) {
  update((current) =>
    current.notes.some((item) => item.id === note.id) ? current : { ...current, notes: insertAt(current.notes, note, index) },
  );
}

// ── Bookmarks ──────────────────────────────────────

/** Accepts "example.com" as well as full URLs; undefined if it can't be a web address */
export function normalizeUrl(input: string): string | undefined {
  const value = input.trim();
  if (!value) return undefined;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) {
      return url.protocol === 'http:' && url.hostname === 'localhost' ? url.href : undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}

export function addBookmark(groupName: string, title: string, url: string) {
  const name = groupName.trim() || 'Allgemein';
  const bookmark: Bookmark = { id: newId(), title: title.trim() || new URL(url).hostname.replace(/^www\./, ''), url };
  update((current) => {
    const group = current.bookmarks.find((item) => item.name.toLowerCase() === name.toLowerCase());
    return {
      ...current,
      bookmarks: group
        ? current.bookmarks.map((item) => (item === group ? { ...item, items: [...item.items, bookmark] } : item))
        : [...current.bookmarks, { id: newId(), name, items: [bookmark] }],
    };
  });
}

export interface RemovedBookmark {
  groupName: string;
  groupIndex: number;
  bookmark: Bookmark;
  index: number;
}

export function deleteBookmark(groupId: Id, bookmarkId: Id): RemovedBookmark | undefined {
  const groupIndex = data.bookmarks.findIndex((group) => group.id === groupId);
  const group = data.bookmarks[groupIndex];
  const index = group?.items.findIndex((item) => item.id === bookmarkId) ?? -1;
  if (!group || index < 0) return undefined;
  update((current) => ({
    ...current,
    bookmarks: current.bookmarks
      .map((item) => (item.id === groupId ? { ...item, items: item.items.filter((entry) => entry.id !== bookmarkId) } : item))
      // Empty groups disappear on their own
      .filter((item) => item.items.length > 0),
  }));
  return { groupName: group.name, groupIndex, bookmark: group.items[index], index };
}

export function restoreBookmark({ groupName, groupIndex, bookmark, index }: RemovedBookmark) {
  update((current) => {
    const group = current.bookmarks.find((item) => item.name === groupName);
    if (group?.items.some((item) => item.id === bookmark.id)) return current;
    return {
      ...current,
      bookmarks: group
        ? current.bookmarks.map((item) => (item === group ? { ...item, items: insertAt(item.items, bookmark, index) } : item))
        : insertAt(current.bookmarks, { id: newId(), name: groupName, items: [bookmark] }, groupIndex),
    };
  });
}

export function renameBookmarkGroup(groupId: Id, name: string) {
  if (!name.trim()) return;
  update((current) => ({
    ...current,
    bookmarks: current.bookmarks.map((group) => (group.id === groupId ? { ...group, name: name.trim() } : group)),
  }));
}

// ── Settings & layout ──────────────────────────────

export function updateSettings(patch: Partial<Settings>) {
  update((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
}

export function updatePomodoroSettings(patch: Partial<PomodoroSettings>) {
  update((current) => {
    const pomodoro = { ...current.settings.pomodoro, ...patch };
    return {
      ...current,
      settings: { ...current.settings, pomodoro },
      // An untouched timer picks up the new length right away
      pomodoro:
        current.pomodoro.status === 'idle'
          ? idlePhase(current.pomodoro.mode, pomodoro, current.pomodoro.cycleDone)
          : current.pomodoro,
    };
  });
}

export function updateTile(tileId: TileId, patch: Partial<TileConfig>) {
  update((current) => ({
    ...current,
    settings: {
      ...current.settings,
      layout: current.settings.layout.map((tile) => (tile.id === tileId ? { ...tile, ...patch } : tile)),
    },
  }));
}

/** Moves a tile to the position of another one */
export function moveTile(tileId: TileId, targetId: TileId) {
  if (tileId === targetId) return;
  update((current) => {
    const layout = [...current.settings.layout];
    const from = layout.findIndex((tile) => tile.id === tileId);
    const to = layout.findIndex((tile) => tile.id === targetId);
    if (from < 0 || to < 0) return current;
    const [tile] = layout.splice(from, 1);
    layout.splice(to, 0, tile);
    return { ...current, settings: { ...current.settings, layout } };
  });
}

export function shiftTile(tileId: TileId, offset: -1 | 1) {
  const layout = data.settings.layout;
  const target = layout[layout.findIndex((tile) => tile.id === tileId) + offset];
  if (target) moveTile(tileId, target.id);
}

// ── Pomodoro ───────────────────────────────────────

export function pomodoroToggle() {
  update((current) => {
    const timer = current.pomodoro;
    const now = Date.now();
    if (timer.status === 'running') {
      return { ...current, pomodoro: { ...timer, status: 'paused', remainingMs: remainingMs(timer, now), endsAt: undefined } };
    }
    return { ...current, pomodoro: { ...timer, status: 'running', endsAt: now + timer.remainingMs } };
  });
}

export function pomodoroStartFocus() {
  update((current) => {
    const timer = current.pomodoro;
    if (timer.mode === 'focus' && timer.status === 'running') return current;
    const base = timer.mode === 'focus' ? timer : idlePhase('focus', current.settings.pomodoro, timer.cycleDone);
    return { ...current, pomodoro: { ...base, status: 'running', endsAt: Date.now() + base.remainingMs } };
  });
}

export function pomodoroReset() {
  update((current) => ({
    ...current,
    pomodoro: idlePhase(current.pomodoro.mode, current.settings.pomodoro, current.pomodoro.cycleDone),
  }));
}

export function pomodoroSetMode(mode: PomodoroMode) {
  update((current) => ({ ...current, pomodoro: idlePhase(mode, current.settings.pomodoro, current.pomodoro.cycleDone) }));
}

/** Jumps to the next phase; a skipped focus session doesn't count */
export function pomodoroSkip() {
  update((current) => {
    const timer = current.pomodoro;
    const next = timer.mode === 'focus' ? { mode: 'short' as const, cycleDone: timer.cycleDone } : nextPhase(timer, current.settings.pomodoro);
    return { ...current, pomodoro: idlePhase(next.mode, current.settings.pomodoro, next.cycleDone) };
  });
}

/** ± whole minutes on the running or waiting timer */
export function pomodoroAdjust(deltaMin: number) {
  update((current) => {
    const timer = current.pomodoro;
    const delta = deltaMin * 60_000;
    const left = remainingMs(timer, Date.now()) + delta;
    if (left < MIN_PHASE_MIN * 60_000 || left > MAX_PHASE_MIN * 60_000) return current;
    const sessionMs = Math.max(timer.sessionMs + delta, left);
    const pomodoro =
      timer.status === 'running' && timer.endsAt !== undefined
        ? { ...timer, endsAt: timer.endsAt + delta, sessionMs }
        : { ...timer, remainingMs: left, sessionMs };
    return { ...current, pomodoro };
  });
}

/**
 * Called by every open tab once the timer reaches zero. Only the first call for
 * a given end time changes anything; it returns the finished mode so that tab
 * alone plays the sound.
 */
export function pomodoroComplete(expectedEndsAt: number): PomodoroMode | undefined {
  let finished: PomodoroMode | undefined;
  update((current) => {
    const timer = current.pomodoro;
    if (timer.status !== 'running' || timer.endsAt !== expectedEndsAt) return current;
    finished = timer.mode;
    const settings = current.settings.pomodoro;
    const stats =
      timer.mode === 'focus'
        ? bumpStats(current.stats, toLocalDate(new Date(expectedEndsAt)), {
            sessions: 1,
            focusMinutes: Math.round(timer.sessionMs / 60_000),
          })
        : current.stats;
    const next = nextPhase(timer, settings);
    const idle = idlePhase(next.mode, settings, next.cycleDone);
    const autoStart = next.mode !== 'focus' && settings.autoStartBreaks;
    return {
      ...current,
      stats,
      pomodoro: autoStart ? { ...idle, status: 'running', endsAt: Date.now() + idle.remainingMs } : idle,
    };
  });
  return finished;
}

// ── Backup ─────────────────────────────────────────

export function exportJson(): string {
  return JSON.stringify(readStored() ?? data, null, 2);
}

/** Throws with a readable message if the file isn't a Cockpit backup */
export function importJson(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  commit(normalize(parsed));
}

/** Clears content but keeps design, layout and timer settings */
export function resetData(kind: 'empty' | 'starter') {
  const fresh = kind === 'empty' ? emptyData() : starterData(new Date());
  const { settings } = data;
  commit({ ...fresh, settings, pomodoro: idlePhase('focus', settings.pomodoro, 0) });
}
