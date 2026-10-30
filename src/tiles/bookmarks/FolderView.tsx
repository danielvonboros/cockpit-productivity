import { useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BookmarkFolder, BookmarkLink, BookmarkNode } from '../../types/models';
import { addBookmarkLink, dropBookmark, moveBookmarkOut, renameBookmarkFolder } from '../../data/store';
import { useToast } from '../../hooks/useToast';
import { useUrlDrop } from '../../hooks/useUrlDrop';
import { Icon } from '../../components/Icon';
import { HexBoard, type HexBoardHandle } from './HexBoard';

interface FolderViewProps {
  folder: BookmarkFolder;
  /** Just created by dropping one bookmark on another: name it right away */
  isNew: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (link: BookmarkLink) => void;
  onRemove: (node: BookmarkNode) => void;
}

/** An opened folder, like on the iPhone home screen; drag a bookmark out of the panel to take it out */
export function FolderView({ folder, isNew, onClose, onAdd, onEdit, onRemove }: FolderViewProps) {
  const toast = useToast();
  const panel = useRef<HTMLDivElement>(null);
  const board = useRef<HexBoardHandle>(null);

  const drop = useUrlDrop((link, event) => {
    const created = addBookmarkLink(link.url, link.title ?? '', { folderId: folder.id, at: board.current?.hexAt(event.clientX, event.clientY) });
    toast(`„${created.title}“ in ${folder.name}`, { tone: 'success' });
  });

  return createPortal(
    <div className="folder-backdrop" onClick={onClose}>
      <div
        ref={panel}
        className={`folder${drop.isOver ? ' is-drop' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Ordner ${folder.name}`}
        onClick={(event) => event.stopPropagation()}
        {...drop.handlers}
      >
        <header className="folder__head">
          <input
            key={folder.id}
            className="folder__name"
            defaultValue={folder.name}
            aria-label="Ordnername"
            autoFocus={isNew}
            onFocus={(event) => isNew && event.currentTarget.select()}
            onBlur={(event) => renameBookmarkFolder(folder.id, event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
          <span className="folder__count">{folder.items.length} Lesezeichen</span>
          <button type="button" className="icon-btn" aria-label="Lesezeichen in diesen Ordner" title="Lesezeichen hinzufügen" onClick={onAdd}>
            <Icon name="plus" size={16} />
          </button>
          <button type="button" className="icon-btn" aria-label="Ordner schließen" title="Schließen (Esc)" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="folder__body">
          <HexBoard
            ref={board}
            nodes={folder.items}
            editable
            ghostRings={1}
            outsideRef={panel}
            onDrop={(id, target) => dropBookmark(id, folder.id, target)}
            onDropOutside={(id) => {
              const last = folder.items.length === 1;
              moveBookmarkOut(folder.id, id);
              toast(last ? 'Ordner war leer und ist weg' : 'Aus dem Ordner genommen');
              onClose();
            }}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        </div>
        <p className="folder__hint">Zum Herausnehmen über den Rand ziehen</p>
      </div>
    </div>,
    document.body,
  );
}
