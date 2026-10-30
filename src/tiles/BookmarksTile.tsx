import { useEffect, useRef, useState } from 'react';
import type { BookmarkNode, Id } from '../types/models';
import { deleteBookmarkLink, dissolveBookmarkFolder, getData, replaceBookmarks, addBookmarkLink, useAppData } from '../data/store';
import { countLinks, findFolder } from '../data/bookmarkTree';
import { normalizeUrl } from '../lib/links';
import { useElementSize } from '../hooks/useElementSize';
import { useToast } from '../hooks/useToast';
import { useUrlDrop } from '../hooks/useUrlDrop';
import { Icon } from '../components/Icon';
import { Tile } from '../components/Tile';
import { HexBoard } from './bookmarks/HexBoard';
import { BookmarkSpace } from './bookmarks/BookmarkSpace';
import { FolderView } from './bookmarks/FolderView';
import { BookmarkSheet, type SheetState } from './bookmarks/BookmarkSheet';

const isTextField = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * The tile shows the honeycomb scaled to fit; a click opens the bookmark space
 * to arrange it. Folders open on top of either.
 */
export function BookmarksTile() {
  const data = useAppData();
  const toast = useToast();
  const preview = useRef<HTMLDivElement>(null);
  const previewSize = useElementSize(preview);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [openFolder, setOpenFolder] = useState<{ id: Id; isNew: boolean } | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const nodes = data.bookmarks;
  const folder = findFolder(nodes, openFolder?.id);
  const count = countLinks(nodes);

  // Escape closes the top-most layer only
  useEffect(() => {
    if (!spaceOpen && !folder && !sheet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (sheet) setSheet(null);
      else if (folder) setOpenFolder(null);
      else setSpaceOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spaceOpen, folder, sheet]);

  // ⌘V with an address on the clipboard adds it to the open space or folder
  useEffect(() => {
    if ((!spaceOpen && !folder) || sheet) return;
    const onPaste = (event: ClipboardEvent) => {
      if (isTextField(event.target)) return;
      const url = normalizeUrl(event.clipboardData?.getData('text/plain') ?? '');
      if (!url) return;
      event.preventDefault();
      const created = addBookmarkLink(url, '', { folderId: folder?.id });
      toast(`„${created.title}“ eingefügt`, { tone: 'success' });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [spaceOpen, folder, sheet, toast]);

  const tileDrop = useUrlDrop((link) => {
    const created = addBookmarkLink(link.url, link.title ?? '');
    toast(`„${created.title}“ hinzugefügt`, { tone: 'success' });
  });

  const remove = (node: BookmarkNode) => {
    const before = getData().bookmarks;
    if (node.kind === 'link') deleteBookmarkLink(node.id);
    else dissolveBookmarkFolder(node.id);
    toast(node.kind === 'link' ? `„${node.title}“ entfernt` : `Ordner „${node.name}“ aufgelöst`, {
      action: { label: 'Rückgängig', run: () => replaceBookmarks(before) },
    });
  };

  const addSheet = (): SheetState => ({ mode: 'add', folderId: folder?.id, folderName: folder?.name });

  return (
    <>
      <Tile
        label="Lesezeichen"
        meta={count}
        className="tile--bookmarks"
        actions={
          <>
            <button type="button" className="icon-btn" aria-label="Lesezeichen hinzufügen" title="Hinzufügen" onClick={() => setSheet({ mode: 'add' })}>
              <Icon name="plus" size={16} />
            </button>
            <button type="button" className="icon-btn" aria-label="Lesezeichen-Raum öffnen" title="Erweitern" onClick={() => setSpaceOpen(true)}>
              <Icon name="expand" size={15} />
            </button>
          </>
        }
      >
        <div
          ref={preview}
          className={`bm-preview${tileDrop.isOver ? ' is-drop' : ''}`}
          onClick={(event) => {
            // Only the empty background opens the space; links and folders do their own thing
            if (!(event.target as Element).closest('.hex-node')) setSpaceOpen(true);
          }}
          {...tileDrop.handlers}
        >
          {nodes.length > 0 ? (
            <HexBoard nodes={nodes} fit={previewSize} onOpenFolder={(item) => setOpenFolder({ id: item.id, isNew: false })} />
          ) : (
            <p className="empty">Adresse aus der Adressleiste hierher ziehen – oder über +.</p>
          )}
          <span className="bm-preview__hint">{tileDrop.isOver ? 'Loslassen zum Hinzufügen' : 'Klicken zum Erweitern'}</span>
        </div>
      </Tile>

      {spaceOpen && (
        <BookmarkSpace
          nodes={nodes}
          onClose={() => setSpaceOpen(false)}
          onOpenFolder={(id, isNew = false) => setOpenFolder({ id, isNew })}
          onAdd={() => setSheet({ mode: 'add' })}
          onEdit={(link) => setSheet({ mode: 'edit', link })}
          onRemove={remove}
        />
      )}
      {folder && (
        <FolderView
          folder={folder}
          isNew={openFolder?.isNew ?? false}
          onClose={() => setOpenFolder(null)}
          onAdd={() => setSheet(addSheet())}
          onEdit={(link) => setSheet({ mode: 'edit', link })}
          onRemove={remove}
        />
      )}
      {sheet && <BookmarkSheet state={sheet} onClose={() => setSheet(null)} />}
    </>
  );
}
