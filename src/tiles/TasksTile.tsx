import { useState } from 'react';
import type { Id, Task, TaskList } from '../types/models';
import {
  addStep, addTask, clearDoneTasks, deleteTask, moveTask, removeStep, renameTask, restoreTasks, setFocus, toggleStep,
  toggleTask, useAppData,
} from '../data/store';
import { useToast } from '../hooks/useToast';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { Tile } from '../components/Tile';
import { TickMeter } from '../components/TickMeter';

type View = 'today' | 'later' | 'done';

const EMPTY_TEXT: Record<View, string> = {
  today: 'Nichts mehr für heute. Genieß es – oder hol dir etwas aus „Später“.',
  later: 'Hier landet alles, was nicht heute sein muss.',
  done: 'Noch nichts erledigt. Das kommt.',
};

const COLUMNS: { view: View; label: string }[] = [
  { view: 'today', label: 'Heute' },
  { view: 'later', label: 'Später' },
  { view: 'done', label: 'Erledigt' },
];

/**
 * One list at a time with tabs; once the tile is wide enough (4 or 8 fields)
 * the same three lists stand side by side as a board.
 */
export function TasksTile() {
  const data = useAppData();
  const toast = useToast();
  const [view, setView] = useState<View>('today');
  const [openId, setOpenId] = useState<Id | null>(null);

  const open = data.tasks.filter((task) => !task.done);
  const lists: Record<View, Task[]> = {
    today: open.filter((task) => task.list === 'today'),
    later: open.filter((task) => task.list === 'later'),
    done: data.tasks.filter((task) => task.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')),
  };

  const complete = (task: Task) => {
    const done = toggleTask(task.id);
    if (!done) return;
    const lastForToday = task.list === 'today' && lists.today.length === 1;
    toast(lastForToday ? 'Alles für heute erledigt. Wow!' : 'Erledigt. Gut gemacht!', {
      tone: 'success',
      action: { label: 'Rückgängig', run: () => toggleTask(task.id) },
    });
  };

  const remove = (task: Task) => {
    const removed = deleteTask(task.id);
    if (removed) toast('Aufgabe gelöscht', { action: { label: 'Rückgängig', run: () => restoreTasks([removed]) } });
  };

  const clearDone = () => {
    const removed = clearDoneTasks();
    toast(`${removed.length} erledigte entfernt`, { action: { label: 'Rückgängig', run: () => restoreTasks(removed) } });
  };

  return (
    <Tile label="Aufgaben" className="tile--tasks">
      <Segmented
        label="Liste"
        value={view}
        onChange={setView}
        options={COLUMNS.map((column) => ({ value: column.view, label: column.label, count: lists[column.view].length }))}
      />

      <div className="task-board">
        {COLUMNS.map((column) => (
          <section
            key={column.view}
            className={`task-col${column.view === view ? ' is-current' : ''}`}
            aria-label={column.label}
          >
            <h3 className="sublabel task-col__head">
              {column.label}
              <span className="task-col__count">{lists[column.view].length}</span>
            </h3>

            <ul className="list scroll">
              {lists[column.view].map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isFocus={data.focusTaskId === task.id}
                  open={openId === task.id}
                  onToggleOpen={() => setOpenId(openId === task.id ? null : task.id)}
                  onComplete={() => (task.done ? toggleTask(task.id) : complete(task))}
                  onDelete={() => remove(task)}
                />
              ))}
              {lists[column.view].length === 0 && <li className="empty">{EMPTY_TEXT[column.view]}</li>}
            </ul>

            {column.view === 'done' ? (
              lists.done.length > 0 && (
                <div className="tile__foot">
                  <button type="button" className="btn btn--ghost" onClick={clearDone}>
                    <Icon name="trash" size={15} />
                    Erledigte entfernen
                  </button>
                </div>
              )
            ) : (
              <AddTaskForm list={column.view} />
            )}
          </section>
        ))}
      </div>
    </Tile>
  );
}

function AddTaskForm({ list }: { list: TaskList }) {
  const [draft, setDraft] = useState('');

  return (
    <form
      className="add-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        addTask(draft, list);
        setDraft('');
      }}
    >
      <input
        className="add-row__input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={list === 'today' ? 'Neue Aufgabe für heute …' : 'Für später merken …'}
        aria-label={list === 'today' ? 'Neue Aufgabe für heute' : 'Neue Aufgabe für später'}
      />
      <button type="submit" className="icon-btn icon-btn--strong" aria-label="Aufgabe hinzufügen">
        <Icon name="plus" size={16} />
      </button>
    </form>
  );
}

interface TaskItemProps {
  task: Task;
  isFocus: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

function TaskItem({ task, isFocus, open, onToggleOpen, onComplete, onDelete }: TaskItemProps) {
  const doneSteps = task.steps.filter((step) => step.done).length;

  return (
    <li className={`card task${task.done ? ' is-done' : ''}${isFocus ? ' is-focus' : ''}${open ? ' is-open' : ''}`}>
      <div className="task__row">
        <button
          type="button"
          className="check"
          aria-pressed={task.done}
          aria-label={task.done ? 'Wieder öffnen' : 'Als erledigt markieren'}
          onClick={onComplete}
        >
          <Icon name="check" size={14} />
        </button>
        <button type="button" className="task__title" aria-expanded={open} onClick={onToggleOpen}>
          <span className="task__text">{task.title}</span>
          {task.steps.length > 0 && (
            <span className="task__meta">
              <TickMeter value={doneSteps} total={task.steps.length} />
              {doneSteps}/{task.steps.length} Schritte
            </span>
          )}
        </button>
        <div className="row-actions">
          {!task.done && (
            <>
              <button
                type="button"
                className={`icon-btn icon-btn--sm${isFocus ? ' is-active' : ''}`}
                aria-label={isFocus ? 'Fokus lösen' : 'Als Fokus setzen'}
                title={isFocus ? 'Fokus lösen' : 'Als Fokus setzen'}
                onClick={() => setFocus(isFocus ? undefined : task.id)}
              >
                <Icon name="target" size={15} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                aria-label={task.list === 'today' ? 'Auf später schieben' : 'Für heute einplanen'}
                title={task.list === 'today' ? 'Auf später schieben' : 'Für heute einplanen'}
                onClick={() => moveTask(task.id, task.list === 'today' ? 'later' : 'today')}
              >
                <Icon name={task.list === 'today' ? 'later' : 'sun'} size={15} />
              </button>
            </>
          )}
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Aufgabe löschen" title="Löschen" onClick={onDelete}>
            <Icon name="trash" size={15} />
          </button>
        </div>
        {isFocus && <span className="dot" title="Aktueller Fokus" />}
      </div>
      {open && <TaskDetail task={task} />}
    </li>
  );
}

/** Mounted only while open, so the title field starts from the current title */
function TaskDetail({ task }: { task: Task }) {
  const [title, setTitle] = useState(task.title);
  const [stepDraft, setStepDraft] = useState('');

  return (
    <div className="task__detail">
      <input
        className="field"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => (title.trim() ? renameTask(task.id, title) : setTitle(task.title))}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        aria-label="Titel bearbeiten"
      />
      {task.steps.length > 0 && (
        <ul className="steps">
          {task.steps.map((step) => (
            <li key={step.id} className={`step${step.done ? ' is-done' : ''}`}>
              <button
                type="button"
                className="check check--sm"
                aria-pressed={step.done}
                aria-label={step.done ? 'Schritt wieder öffnen' : 'Schritt erledigt'}
                onClick={() => toggleStep(task.id, step.id)}
              >
                <Icon name="check" size={11} />
              </button>
              <span className="step__text">{step.title}</span>
              <button
                type="button"
                className="icon-btn icon-btn--xs"
                aria-label="Schritt löschen"
                onClick={() => removeStep(task.id, step.id)}
              >
                <Icon name="close" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="step-add"
        onSubmit={(event) => {
          event.preventDefault();
          addStep(task.id, stepDraft);
          setStepDraft('');
        }}
      >
        <Icon name="plus" size={14} />
        <input
          value={stepDraft}
          onChange={(event) => setStepDraft(event.target.value)}
          placeholder={task.steps.length ? 'Noch ein kleiner Schritt …' : 'In kleine Schritte zerlegen …'}
          aria-label="Schritt hinzufügen"
        />
      </form>
    </div>
  );
}
