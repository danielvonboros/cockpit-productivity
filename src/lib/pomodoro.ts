import type { PomodoroMode, PomodoroSettings, PomodoroState } from '../types/models';

export const MODE_LABELS: Record<PomodoroMode, string> = {
  focus: 'Fokus',
  short: 'Pause',
  long: 'Lange Pause',
};

export const MIN_PHASE_MIN = 1;
export const MAX_PHASE_MIN = 120;

export function durationMs(mode: PomodoroMode, settings: PomodoroSettings): number {
  const minutes = { focus: settings.focusMin, short: settings.shortMin, long: settings.longMin }[mode];
  return minutes * 60_000;
}

export function remainingMs(state: PomodoroState, now: number): number {
  if (state.status === 'running' && state.endsAt !== undefined) return Math.max(0, state.endsAt - now);
  return state.remainingMs;
}

export function idlePhase(mode: PomodoroMode, settings: PomodoroSettings, cycleDone: number): PomodoroState {
  const length = durationMs(mode, settings);
  return { mode, status: 'idle', remainingMs: length, sessionMs: length, cycleDone };
}

/** Focus → short break, every n-th focus → long break, any break → focus */
export function nextPhase(state: PomodoroState, settings: PomodoroSettings): { mode: PomodoroMode; cycleDone: number } {
  if (state.mode === 'focus') {
    const cycleDone = state.cycleDone + 1;
    return { mode: cycleDone >= settings.longEvery ? 'long' : 'short', cycleDone };
  }
  return { mode: 'focus', cycleDone: state.mode === 'long' ? 0 : state.cycleDone };
}
