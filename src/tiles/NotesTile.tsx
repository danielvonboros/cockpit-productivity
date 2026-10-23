import { useCallback, useEffect, useRef, useState } from 'react';
import type { Id, Note } from '../types/models';
import { addNote, deleteNote, restoreNote, toggleNotePin, updateNote, useAppData } from '../data/store';
import { formatRelativeStamp } from '../lib/dates';
import { useNow } from '../hooks/useNow';
import { useToast } from '../hooks/useToast';
import { Icon } from '../components/Icon';
import { Tile } from '../components/Tile';

const SAVE_DELAY_MS = 400;
const SEARCH_FROM = 5;

function noteTitle(note: Note): string {
  return note.body.split('\n').find((line) => line.trim())?.trim() ?? 'Leere Notiz';
}

function noteSnippet(note: Note): string {
  const lines = note.body.split('\n').filter((line) => line.trim());
  return lines.slice(1).join(' · ');
}

export function NotesTile() {
  const data = useAppData();
  const toast = useToast();
  const now = useNow(60_000);
  const [openId, setOpenId] = useState<Id | null>(null);
  const [query, setQuery] = useState('');
  const [capture, setCapture] = useState('');

  const openNote = data.notes.find((note) => note.id === openId);

  const remove = (noteId: Id, silent = false) => {
    const removed = deleteNote(noteId);
    setOpenId(null);
    if (removed && !silent) toast('Notiz gelöscht', { action: { label: 'Rückgängig', run: () => restoreNote(removed) } });
  };

  if (openNote) {
    return (
      <Tile label="Notizen" className="tile--notes">
        <NoteEditor
          key={openNote.id}
          note={openNote}
          now={now}
          onClose={(body) => (body.trim() ? setOpenId(null) : remove(openNote.id, true))}
          onDelete={() => remove(openNote.id)}
        />
      </Tile>
    );
  }

  const needle = query.trim().toLowerCase();
  const notes = [...data.notes]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
    .filter((note) => !needle || note.body.toLowerCase().includes(needle));

  return (
    <Tile
      label="Notizen"
      meta={data.notes.length}
      className="tile--notes"
      actions={
        <button type="button" className="icon-btn" aria-label="Neue Notiz" title="Neue Notiz" onClick={() => setOpenId(addNote())}>
          <Icon name="plus" size={16} />
        </button>
      }
    >
      {data.notes.length >= SEARCH_FROM && (
        <label className="search">
          <Icon name="search" size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Notizen durchsuchen …" />
        </label>
      )}

      <ul className="list scroll">
        {notes.map((note) => (
          <li key={note.id}>
            <button type="button" className="card note-card" onClick={() => setOpenId(note.id)}>
              <span className="note-card__title">
                {note.pinned && <Icon name="pin" size={13} />}
                <span>{noteTitle(note)}</span>
              </span>
              {noteSnippet(note) && <span className="note-card__snippet">{noteSnippet(note)}</span>}
              <span className="note-card__stamp mono">{formatRelativeStamp(note.updatedAt, new Date(now))}</span>
            </button>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="empty">{needle ? 'Nichts gefunden.' : 'Noch keine Notizen. Gedanken, die raus müssen, landen hier.'}</li>
        )}
      </ul>

      <form
        className="add-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!capture.trim()) return;
          addNote(capture.trim());
          setCapture('');
          toast('Notiert');
        }}
      >
        <input
          className="add-row__input"
          value={capture}
          onChange={(event) => setCapture(event.target.value)}
          placeholder="Schnell notieren, Enter speichert …"
          aria-label="Schnelle Notiz"
        />
        <button type="submit" className="icon-btn icon-btn--strong" aria-label="Notiz speichern">
          <Icon name="plus" size={16} />
        </button>
      </form>
    </Tile>
  );
}

interface NoteEditorProps {
  note: Note;
  now: number;
  onClose: (body: string) => void;
  onDelete: () => void;
}

/** Saves while typing; pending text is flushed on close, unmount and when the tab goes away */
function NoteEditor({ note, now, onClose, onDelete }: NoteEditorProps) {
  const [body, setBody] = useState(note.body);
  const [saving, setSaving] = useState(false);
  const pending = useRef<string | null>(null);
  const timer = useRef(0);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (pending.current === null) return;
    updateNote(note.id, pending.current);
    pending.current = null;
    setSaving(false);
  }, [note.id]);

  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  const change = (value: string) => {
    setBody(value);
    setSaving(true);
    pending.current = value;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
  };

  return (
    <div className="note-editor">
      <div className="note-editor__bar">
        <button
          type="button"
          className="icon-btn"
          aria-label="Zurück zur Übersicht"
          title="Zurück"
          onClick={() => {
            flush();
            onClose(body);
          }}
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <span className="note-editor__stamp mono">
          {saving ? 'Speichert …' : `Gespeichert · ${formatRelativeStamp(note.updatedAt, new Date(now))}`}
        </span>
        <button
          type="button"
          className={`icon-btn${note.pinned ? ' is-active' : ''}`}
          aria-pressed={note.pinned}
          aria-label="Anheften"
          title="Anheften"
          onClick={() => toggleNotePin(note.id)}
        >
          <Icon name="pin" size={15} />
        </button>
        <button type="button" className="icon-btn" aria-label="Notiz löschen" title="Löschen" onClick={onDelete}>
          <Icon name="trash" size={15} />
        </button>
      </div>
      <textarea
        className="note-editor__text"
        value={body}
        onChange={(event) => change(event.target.value)}
        onBlur={flush}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            flush();
            onClose(body);
          }
        }}
        placeholder="Die erste Zeile wird zum Titel …"
        aria-label="Notiz"
        autoFocus
      />
    </div>
  );
}
