import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { BookmarkLink, Id } from '../../types/models';
import { addBookmarkLink, updateBookmarkLink } from '../../data/store';
import { normalizeUrl, titleFromUrl } from '../../lib/links';

export type SheetState = { mode: 'add'; folderId?: Id; folderName?: string } | { mode: 'edit'; link: BookmarkLink };

/** Small dialog to add a bookmark by address or to edit one */
export function BookmarkSheet({ state, onClose }: { state: SheetState; onClose: () => void }) {
  const editing = state.mode === 'edit' ? state.link : undefined;
  const [url, setUrl] = useState(editing?.url ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [error, setError] = useState('');

  const heading = editing ? 'Lesezeichen bearbeiten' : state.mode === 'add' && state.folderName ? `Neu in ${state.folderName}` : 'Neues Lesezeichen';

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        aria-label={heading}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = normalizeUrl(url);
          if (!normalized) {
            setError('Das sieht nicht nach einer Web-Adresse aus.');
            return;
          }
          if (editing) updateBookmarkLink(editing.id, { url: normalized, title: title.trim() || titleFromUrl(normalized) });
          else addBookmarkLink(normalized, title, { folderId: state.mode === 'add' ? state.folderId : undefined });
          onClose();
        }}
      >
        <h2 className="label">{heading}</h2>
        <input
          className="field"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError('');
          }}
          placeholder="Adresse, z. B. notion.so"
          aria-label="Adresse"
          aria-invalid={Boolean(error)}
          autoFocus
        />
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name (optional)" aria-label="Name" />
        {error && <p className="form-error">{error}</p>}
        {!editing && <p className="hint">Schneller: das Symbol links in der Adressleiste ins Lesezeichen-Feld ziehen.</p>}
        <div className="sheet__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn btn--primary">
            Speichern
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
