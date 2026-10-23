import { useEffect } from 'react';
import { getData, pomodoroComplete, useAppData } from '../data/store';
import { formatCountdown } from '../lib/dates';
import { MODE_LABELS, remainingMs } from '../lib/pomodoro';
import { audioReady, chime, notify } from '../lib/signals';
import { useNow } from '../hooks/useNow';
import { useToast } from '../hooks/useToast';

const DEFAULT_TITLE = 'Neuer Tab';

const MESSAGES = {
  focus: 'Fokus-Session geschafft. Zeit für eine Pause.',
  short: 'Pause vorbei. Bereit für die nächste Runde?',
  long: 'Lange Pause vorbei. Neue Runde, neues Glück.',
} as const;

/**
 * Finishes pomodoro phases even when the tile is hidden. Every open tab waits
 * for the end time; a visible tab (or one that may play sound) goes first, and
 * only the tab that actually completes the phase rings.
 */
export function PomodoroEngine() {
  const timer = useAppData().pomodoro;
  const toast = useToast();
  const endsAt = timer.status === 'running' ? timer.endsAt : undefined;

  useEffect(() => {
    if (endsAt === undefined) return;

    const finish = () => {
      const run = () => {
        const finished = pomodoroComplete(endsAt);
        if (!finished) return;
        const settings = getData().settings.pomodoro;
        if (settings.sound) chime();
        if (settings.notify) notify(MODE_LABELS[finished], MESSAGES[finished]);
        toast(MESSAGES[finished], { tone: 'success' });
      };
      if ('locks' in navigator) void navigator.locks.request('cockpit-pomodoro', run);
      else run();
    };

    const priority = document.visibilityState === 'visible' ? 0 : audioReady() ? 250 : 700;
    const timeout = window.setTimeout(finish, Math.max(0, endsAt - Date.now()) + priority);
    return () => window.clearTimeout(timeout);
  }, [endsAt, toast]);

  return <TabTitle />;
}

/** Remaining time in the browser tab title while the timer runs */
function TabTitle() {
  const timer = useAppData().pomodoro;
  const running = timer.status === 'running';
  const now = useNow(1000, running);

  useEffect(() => {
    document.title = running ? `${formatCountdown(remainingMs(timer, now))} · ${MODE_LABELS[timer.mode]}` : DEFAULT_TITLE;
  }, [running, timer, now]);

  useEffect(() => () => void (document.title = DEFAULT_TITLE), []);

  return null;
}
