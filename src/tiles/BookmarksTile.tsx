import { useState } from 'react';
import type { Bookmark, BookmarkGroup } from '../types/models';
import {
  addBookmark, deleteBookmark, normalizeUrl, renameBookmarkGroup, restoreBookmark, useAppData,
} from '../data/store';
import { useToast } from '../hooks/useToast';
import { Icon } from '../components/Icon';
import { Tile } from '../components/Tile';

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

export function BookmarksTile() {
  const data = useAppData();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const count = data.bookmarks.reduce((sum, group) => sum + group.items.length, 0);

  const remove = (group: BookmarkGroup, bookmark: Bookmark) => {
    const removed = deleteBookmark(group.id, bookmark.id);
    if (removed) toast(`„${bookmark.title}“ entfernt`, { action: { label: 'Rückgängig', run: () => restoreBookmark(removed) } });
  };

  return (
    <Tile
      label="Lesezeichen"
      meta={count}
      className="tile--bookmarks"
      actions={
        count > 0 && (
          <button
            type="button"
            className={`icon-btn${editing ? ' is-active' : ''}`}
            aria-pressed={editing}
            aria-label="Lesezeichen bearbeiten"
            title={editing ? 'Fertig' : 'Bearbeiten'}
            onClick={() => setEditing(!editing)}
          >
            <Icon name={editing ? 'check' : 'pencil'} size={15} />
          </button>
        )
      }
    >
      <div className="bookmarks scroll">
        {data.bookmarks.map((group) => (
          <div key={group.id} className="bm-group">
            {editing ? (
              <input
                className="field field--sub"
                defaultValue={group.name}
                onBlur={(event) => renameBookmarkGroup(group.id, event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                aria-label="Gruppe umbenennen"
              />
            ) : (
              <h3 className="sublabel">{group.name}</h3>
            )}
            <ul className="bm-grid">
              {group.items.map((bookmark) => (
                <li key={bookmark.id} className="bm">
                  <a className="card bm__link" href={bookmark.url} title={bookmark.url}>
                    <Favicon url={bookmark.url} title={bookmark.title} />
                    <span className="bm__text">
                      <span className="bm__title">{bookmark.title}</span>
                      <span className="bm__host">{hostOf(bookmark.url)}</span>
                    </span>
                  </a>
                  {editing && (
                    <button
                      type="button"
                      className="bm__remove"
                      aria-label={`${bookmark.title} entfernen`}
                      onClick={() => remove(group, bookmark)}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {count === 0 && <p className="empty">Deine wichtigsten Seiten, einen Klick entfernt.</p>}
      </div>

      {adding ? (
        <BookmarkForm groups={data.bookmarks.map((group) => group.name)} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="add-row add-row--button" onClick={() => setAdding(true)}>
          <span className="add-row__input">Lesezeichen hinzufügen</span>
          <span className="icon-btn icon-btn--strong" aria-hidden="true">
            <Icon name="plus" size={16} />
          </span>
        </button>
      )}
    </Tile>
  );
}

/** Site icon with a letter as fallback; nothing is sent anywhere but the site itself */
function Favicon({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>('loading');
  const { origin, hostname } = new URL(url);
  const letter = (title || hostname).trim().charAt(0).toUpperCase();

  return (
    <span className={`bm__icon is-${state}`}>
      {state !== 'ok' && <span className="bm__letter">{letter}</span>}
      {state !== 'failed' && (
        <img
          src={`${origin}/favicon.ico`}
          alt=""
          width={18}
          height={18}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={(event) => setState(event.currentTarget.naturalWidth > 1 ? 'ok' : 'failed')}
          onError={() => setState('failed')}
        />
      )}
    </span>
  );
}

function BookmarkForm({ groups, onDone }: { groups: string[]; onDone: () => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [group, setGroup] = useState(groups[0] ?? 'Allgemein');
  const [error, setError] = useState('');

  return (
    <form
      className="bm-form"
      onSubmit={(event) => {
        event.preventDefault();
        const normalized = normalizeUrl(url);
        if (!normalized) {
          setError('Das sieht nicht nach einer Web-Adresse aus.');
          return;
        }
        addBookmark(group, title, normalized);
        onDone();
      }}
      onKeyDown={(event) => event.key === 'Escape' && onDone()}
    >
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
      <div className="bm-form__row">
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name (optional)" aria-label="Name" />
        <input className="field" value={group} onChange={(event) => setGroup(event.target.value)} list="bm-groups" placeholder="Gruppe" aria-label="Gruppe" />
        <datalist id="bm-groups">
          {groups.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="bm-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onDone}>
          Abbrechen
        </button>
        <button type="submit" className="btn btn--primary">
          Speichern
        </button>
      </div>
    </form>
  );
}
