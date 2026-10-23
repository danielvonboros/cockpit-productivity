import type { PomodoroMode } from '../types/models';
import {
  dayStats, pomodoroAdjust, pomodoroReset, pomodoroSetMode, pomodoroSkip, pomodoroToggle, useAppData,
} from '../data/store';
import { formatCountdown, formatMinutes, toLocalDate } from '../lib/dates';
import { MODE_LABELS, remainingMs } from '../lib/pomodoro';
import { unlockAudio } from '../lib/signals';
import { useNow } from '../hooks/useNow';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { Tile } from '../components/Tile';
import { TickMeter } from '../components/TickMeter';

const MODE_OPTIONS: { value: PomodoroMode; label: string }[] = [
  { value: 'focus', label: 'Fokus' },
  { value: 'short', label: 'Pause' },
  { value: 'long', label: 'Lang' },
];

const STATUS_LABELS = { idle: 'Bereit', running: 'Läuft', paused: 'Pausiert' } as const;

export function PomodoroTile() {
  const data = useAppData();
  const timer = data.pomodoro;
  const settings = data.settings.pomodoro;
  const running = timer.status === 'running';
  const now = useNow(250, running);
  const left = remainingMs(timer, now);
  const today = dayStats(data, toLocalDate(new Date(now)));
  const totalMin = timer.sessionMs / 60_000;

  return (
    <Tile
      label="Pomodoro"
      meta={
        <span className={`signal signal--${timer.status}${running ? ' is-live' : ''}`}>
          <span className="dot" />
          {STATUS_LABELS[timer.status]}
        </span>
      }
      className={`tile--pomodoro is-${timer.mode}`}
    >
      <Segmented label="Phase" value={timer.mode} options={MODE_OPTIONS} onChange={pomodoroSetMode} size="sm" />

      <div className="pomo">
        <div className="pomo__gauge">
          <Ruler totalMin={totalMin} leftMin={left / 60_000} />
          <div className="pomo__readout">
            <span className="pomo__big" aria-live="off">
              {formatCountdown(left)}
            </span>
            <span className="pomo__caption">Verbleibend</span>
            <span className="pomo__divider" />
            <span className="pomo__mid">
              {Math.round(totalMin)}
              <span className="unit">min</span>
            </span>
            <span className="pomo__caption">Ziel · {MODE_LABELS[timer.mode]}</span>
          </div>
        </div>
        <Dpad running={running} />
      </div>

      <div className="mini-row">
        <div className="mini-card">
          <span className="mini-card__label">Runde</span>
          <span className="mini-card__value">
            <TickMeter value={timer.cycleDone} total={settings.longEvery} tone="accent" />
            {Math.min(timer.cycleDone, settings.longEvery)}/{settings.longEvery}
          </span>
        </div>
        <div className="mini-card">
          <span className="mini-card__label">Heute</span>
          <span className="mini-card__value">
            {today.sessions} × · {formatMinutes(today.focusMinutes)}
          </span>
        </div>
      </div>
    </Tile>
  );
}

/** Vertical scale like a speed gauge: ticks per minute, marker at the time left */
function Ruler({ totalMin, leftMin }: { totalMin: number; leftMin: number }) {
  const scaleMax = Math.max(5, Math.ceil(totalMin / 5) * 5);
  const step = scaleMax <= 30 ? 1 : scaleMax <= 60 ? 2 : 5;
  const labelEvery = scaleMax <= 30 ? 5 : scaleMax <= 60 ? 10 : 30;
  const height = 156;
  const pad = 9;
  const y = (minute: number) => pad + (1 - minute / scaleMax) * (height - pad * 2);
  const warnBelow = Math.min(2, scaleMax);

  const ticks: number[] = [];
  for (let minute = 0; minute <= scaleMax; minute += step) ticks.push(minute);

  return (
    <svg className="ruler" viewBox={`0 0 54 ${height}`} width="54" height={height} aria-hidden="true">
      <line className="ruler__spine" x1="0.5" x2="0.5" y1={pad} y2={height - pad} />
      {ticks.map((minute) => {
        const major = minute % labelEvery === 0;
        const state = minute > leftMin ? 'off' : minute < warnBelow ? 'warn' : 'on';
        return (
          <g key={minute}>
            <line className={`ruler__tick is-${state}`} x1="1" x2={major ? 13 : 7} y1={y(minute)} y2={y(minute)} />
            {major && (
              <text className="ruler__num" x="22" y={y(minute)}>
                {minute}
              </text>
            )}
          </g>
        );
      })}
      <g className="ruler__marker" transform={`translate(0 ${y(Math.min(leftMin, scaleMax))})`}>
        <line x1="1" x2="17" y1="0" y2="0" />
        <rect x="18" y="-10" width="32" height="20" rx="6" />
        <text x="34" y="0">
          {Math.ceil(leftMin)}
        </text>
      </g>
    </svg>
  );
}

/** Round control pad: centre starts/pauses, the four arms adjust, reset and skip */
function Dpad({ running }: { running: boolean }) {
  return (
    <div className="dpad" role="group" aria-label="Timer-Steuerung">
      <button type="button" className="dpad__arm dpad__arm--up" aria-label="Eine Minute mehr" title="+1 Minute" onClick={() => pomodoroAdjust(1)}>
        <Icon name="plus" size={16} />
      </button>
      <button type="button" className="dpad__arm dpad__arm--right" aria-label="Nächste Phase" title="Nächste Phase" onClick={pomodoroSkip}>
        <Icon name="skip" size={15} />
      </button>
      <button type="button" className="dpad__arm dpad__arm--down" aria-label="Eine Minute weniger" title="−1 Minute" onClick={() => pomodoroAdjust(-1)}>
        <Icon name="minus" size={16} />
      </button>
      <button type="button" className="dpad__arm dpad__arm--left" aria-label="Zurücksetzen" title="Zurücksetzen" onClick={pomodoroReset}>
        <Icon name="reset" size={15} />
      </button>
      <button
        type="button"
        className="dpad__center"
        aria-label={running ? 'Pausieren' : 'Starten'}
        onClick={() => {
          unlockAudio();
          pomodoroToggle();
        }}
      >
        <Icon name={running ? 'pause' : 'play'} size={22} filled={!running} />
      </button>
    </div>
  );
}
