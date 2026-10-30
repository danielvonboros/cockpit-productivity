import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BookmarkLink, BookmarkNode, Hex, Id } from '../../types/models';
import { addBookmarkLink, dropBookmark } from '../../data/store';
import { countLinks } from '../../data/bookmarkTree';
import { hexEquals } from '../../lib/hex';
import { useToast } from '../../hooks/useToast';
import { useUrlDrop } from '../../hooks/useUrlDrop';
import { Icon } from '../../components/Icon';
import { HexBoard, type HexBoardHandle } from './HexBoard';

interface BookmarkSpaceProps {
  nodes: BookmarkNode[];
  onClose: () => void;
  onOpenFolder: (folderId: Id, isNew?: boolean) => void;
  onAdd: () => void;
  onEdit: (link: BookmarkLink) => void;
  onRemove: (node: BookmarkNode) => void;
}

/** The expanded bookmark tile: the whole honeycomb, arranged by dragging */
export function BookmarkSpace({ nodes, onClose, onOpenFolder, onAdd, onEdit, onRemove }: BookmarkSpaceProps) {
  const toast = useToast();
  const board = useRef<HexBoardHandle>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [dropCell, setDropCell] = useState<Hex>();

  useEffect(() => closeButton.current?.focus(), []);

  // A honeycomb larger than the screen opens on its middle, not its top-left corner
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
  }, []);

  const drop = useUrlDrop(
    (link, event) => {
      const created = addBookmarkLink(link.url, link.title ?? '', { at: board.current?.hexAt(event.clientX, event.clientY) });
      setDropCell(undefined);
      toast(`„${created.title}“ hinzugefügt`, { tone: 'success' });
    },
    (event) => {
      const cell = board.current?.hexAt(event.clientX, event.clientY);
      if (cell && !(dropCell && hexEquals(cell, dropCell))) setDropCell(cell);
    },
  );

  return createPortal(
    <div className="space-backdrop" onClick={onClose}>
      <div className="space" role="dialog" aria-modal="true" aria-label="Lesezeichen" onClick={(event) => event.stopPropagation()}>
        <header className="space__head">
          <h2 className="label">
            Lesezeichen
            <span className="tile__meta">{countLinks(nodes)}</span>
          </h2>
          <p className="space__hint">
            Ziehen zum Anordnen · auf ein anderes Lesezeichen ziehen ergibt einen Ordner · Adresse hineinziehen oder
            mit ⌘V einfügen
          </p>
          <button type="button" className="btn btn--primary" aria-label="Lesezeichen hinzufügen" onClick={onAdd}>
            <Icon name="plus" size={16} />
            <span className="btn__text">Lesezeichen</span>
          </button>
          <button ref={closeButton} type="button" className="icon-btn" aria-label="Schließen" title="Schließen (Esc)" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div ref={canvas} className={`space__canvas${drop.isOver ? ' is-drop' : ''}`} {...drop.handlers}>
          <div className="space__center">
            <HexBoard
              ref={board}
              nodes={nodes}
              editable
              canCreateFolders
              highlight={drop.isOver ? dropCell : undefined}
              onOpenFolder={(folder) => onOpenFolder(folder.id)}
              onDrop={(id, target) => {
                const created = dropBookmark(id, undefined, target);
                if (created) onOpenFolder(created, true);
              }}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
