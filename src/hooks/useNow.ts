import { useLayoutEffect, useState } from 'react';

/**
 * Current time in ms, refreshed on whole multiples of `intervalMs` so a clock
 * ticks exactly on the second. Stops ticking while `active` is false.
 * Layout effect: when ticking resumes, the stale time is replaced before paint.
 */
export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());

  useLayoutEffect(() => {
    if (!active) return;
    let timer = 0;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      timer = window.setTimeout(tick, intervalMs - (time % intervalMs) + 4);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [intervalMs, active]);

  return now;
}
