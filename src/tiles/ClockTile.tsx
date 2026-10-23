import { useState } from 'react';
import type { AppData, Task } from '../types/models';
import {
  dayStats, focusNewTask, pomodoroStartFocus, setFocus, toggleStep, toggleTask, useAppData,
} from '../data/store';
import { clockParts, formatMinutes, greeting, isoWeek, toLocalDate } from '../lib/dates';
import { unlockAudio } from '../lib/signals';
import { useNow } from '../hooks/useNow';
import { useToast } from '../hooks/useToast';
import { Icon, type IconName } from '../components/Icon';
import { Tile } from '../components/Tile';
import { TickMeter } from '../components/TickMeter';

export function ClockTile() {
  const data = useAppData();
  const now = useNow(1000);
  const date = new Date(now);
  const { hours, minutes, seconds } = clockParts(date);
  const stats = dayStats(data, toLocalDate(date));
  const openToday = data.tasks.filter((task) => task.list === 'today' && !task.done);
  const name = data.settings.name.trim();
  const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
  const day = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });

  return (
    <Tile label={`${weekday} · ${day}`} meta={<span className="mono">KW {isoWeek(date)}</span>} className="tile--clock">
      <div className="clock">
        <div className="clock__main">
          <time className="clock__time" dateTime={date.toISOString()}>
            {hours}
            <span className="clock__colon">:</span>
            {minutes}
            {data.settings.showSeconds && <span className="clock__sec">{seconds}</span>}
          </time>
          <p className="clock__greeting">
            {greeting(date)}
            {name ? `, ${name}` : ''}.
          </p>
        </div>

        <div className="clock__side">
          <FocusCard data={data} openToday={openToday} />
          <div className="stat-row">
            <StatCard icon="list" label="Offen heute" value={openToday.length} />
            <StatCard icon="check" label="Erledigt heute" value={stats.tasksDone} />
            <StatCard icon="timer" label="Fokuszeit heute" value={formatMinutes(stats.focusMinutes)} />
          </div>
        </div>
      </div>
    </Tile>
  );
}

function FocusCard({ data, openToday }: { data: AppData; openToday: Task[] }) {
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const focus = data.tasks.find((task) => task.id === data.focusTaskId && !task.done);

  if (!focus) {
    const suggestions = openToday.slice(0, 3);
    return (
      <div className="focus focus--empty">
        <span className="label">Fokus</span>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            focusNewTask(draft);
            setDraft('');
          }}
        >
          <input
            className="focus__input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Worauf konzentrierst du dich gerade?"
            aria-label="Fokus festlegen"
          />
        </form>
        {suggestions.length > 0 && (
          <div className="focus__suggest">
            <span>oder aus Heute:</span>
            {suggestions.map((task) => (
              <button key={task.id} type="button" className="chip" onClick={() => setFocus(task.id)}>
                {task.title}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const nextStep = focus.steps.find((step) => !step.done);
  const doneSteps = focus.steps.filter((step) => step.done).length;
  const timer = data.pomodoro;
  const focusRunning = timer.mode === 'focus' && timer.status === 'running';

  const complete = () => {
    toggleTask(focus.id);
    toast('Fokus erledigt. Stark!', {
      tone: 'success',
      action: {
        label: 'Rückgängig',
        run: () => {
          toggleTask(focus.id);
          setFocus(focus.id);
        },
      },
    });
  };

  return (
    <div className="focus">
      <div className="focus__head">
        <span className="label">Fokus</span>
        <span className={`signal${focusRunning ? ' is-live' : ''}`}>
          <span className="dot" />
          {focusRunning ? 'Timer läuft' : 'Aktiv'}
        </span>
        <button type="button" className="icon-btn icon-btn--sm" aria-label="Fokus lösen" title="Fokus lösen" onClick={() => setFocus(undefined)}>
          <Icon name="close" size={15} />
        </button>
      </div>
      <p className="focus__title">{focus.title}</p>
      {nextStep && (
        <button type="button" className="focus__step" onClick={() => toggleStep(focus.id, nextStep.id)}>
          <span className="check check--sm" aria-hidden="true">
            <Icon name="check" size={12} />
          </span>
          <span>
            <span className="focus__step-label">Nächster Schritt</span>
            {nextStep.title}
          </span>
          <TickMeter value={doneSteps} total={focus.steps.length} />
        </button>
      )}
      <div className="focus__actions">
        <button type="button" className="btn btn--primary" onClick={complete}>
          <Icon name="check" size={16} />
          Erledigt
        </button>
        {!focusRunning && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              unlockAudio();
              pomodoroStartFocus();
            }}
          >
            <Icon name="play" size={14} filled />
            Timer starten
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: IconName; label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat__icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}
