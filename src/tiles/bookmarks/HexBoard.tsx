import {
  useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
  type CSSProperties, type PointerEvent as ReactPointerEvent, type Ref, type RefObject,
} from 'react';
import type { BookmarkFolder, BookmarkLink, BookmarkNode, Hex, Id } from '../../types/models';
import {
  HEX_HEIGHT, HEX_RADIUS, HEX_WIDTH, cellsAround, hexEquals, hexKey, hexToPoint, pointToHex, roundedHexPath,
} from '../../lib/hex';
import { hostOf } from '../../lib/links';
import { dropOutcome, type DropOutcome } from '../../data/bookmarkTree';
import { Icon } from '../../components/Icon';
import { Favicon } from './Favicon';

const SHAPE = roundedHexPath(HEX_WIDTH / 2, HEX_HEIGHT / 2, HEX_RADIUS - 3, 10);
const VIEW_BOX = `0 0 ${HEX_WIDTH} ${HEX_HEIGHT}`;
const DRAG_THRESHOLD = 6;
const MIN_FIT_SCALE = 0.45;
/** A few bookmarks in a large tile may grow a little */
const MAX_FIT_SCALE = 1.25;

const HINTS: Record<DropOutcome, string> = {
  move: 'Hierher',
  swap: 'Plätze tauschen',
  folder: 'Ordner erstellen',
  into: 'In den Ordner',
};

export interface HexBoardHandle {
  /** Cell under a screen point, for links dropped in from outside */
  hexAt: (clientX: number, clientY: number) => Hex;
}

interface HexBoardProps {
  nodes: BookmarkNode[];
  /** Drag to arrange, empty cells visible, edit and remove buttons */
  editable?: boolean;
  /** Top level only: a link dropped on a link makes a folder */
  canCreateFolders?: boolean;
  /** How far the visible raster reaches beyond the outermost bookmark */
  ghostRings?: number;
  /** Scale down to fit this box (tile preview) */
  fit?: { width: number; height: number };
  /** Cell under a link being dragged in from outside */
  highlight?: Hex;
  /** Leaving this element while dragging means "take it out" (folder view) */
  outsideRef?: RefObject<HTMLElement | null>;
  onOpenFolder?: (folder: BookmarkFolder) => void;
  onDrop?: (id: Id, target: Hex) => void;
  onDropOutside?: (id: Id) => void;
  onEdit?: (link: BookmarkLink) => void;
  onRemove?: (node: BookmarkNode) => void;
  ref?: Ref<HexBoardHandle>;
}

interface DragState {
  id: Id;
  origin: Hex;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  moved: boolean;
  outside: boolean;
  target?: Hex;
}

/** Bookmarks and folders on a honeycomb, centred around their cluster */
export function HexBoard({
  nodes, editable = false, canCreateFolders = false, ghostRings = 2, fit, highlight, outsideRef,
  onOpenFolder, onDrop, onDropOutside, onEdit, onRemove, ref,
}: HexBoardProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Window listeners read the latest drag from here instead of a stale closure
  const dragRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  const layout = useMemo(() => {
    const cells = nodes.map((node) => node.pos);
    const ghosts = editable ? cellsAround(cells, ghostRings) : [];
    const all = cells.length + ghosts.length > 0 ? [...cells, ...ghosts] : [{ q: 0, r: 0 }];
    const points = all.map((cell) => hexToPoint(cell));
    const pad = editable ? 18 : 4;
    const minX = Math.min(...points.map((point) => point.x)) - HEX_WIDTH / 2 - pad;
    const maxX = Math.max(...points.map((point) => point.x)) + HEX_WIDTH / 2 + pad;
    const minY = Math.min(...points.map((point) => point.y)) - HEX_RADIUS - pad;
    const maxY = Math.max(...points.map((point) => point.y)) + HEX_RADIUS + pad;
    return { ghosts, minX, minY, width: maxX - minX, height: maxY - minY };
  }, [nodes, editable, ghostRings]);

  const scale = fit
    ? Math.max(MIN_FIT_SCALE, Math.min(MAX_FIT_SCALE, (fit.width - 24) / layout.width, (fit.height - 24) / layout.height))
    : 1;

  const place = (cell: Hex): CSSProperties => {
    const point = hexToPoint(cell);
    return {
      left: point.x - layout.minX - HEX_WIDTH / 2,
      top: point.y - layout.minY - HEX_RADIUS,
      width: HEX_WIDTH,
      height: HEX_HEIGHT,
    };
  };

  const hexAt = useCallback(
    (clientX: number, clientY: number) => {
      const rect = innerRef.current?.getBoundingClientRect();
      if (!rect) return { q: 0, r: 0 };
      return pointToHex((clientX - rect.left) / scale + layout.minX, (clientY - rect.top) / scale + layout.minY);
    },
    [layout, scale],
  );
  useImperativeHandle(ref, () => ({ hexAt }), [hexAt]);

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      const moved = current.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD;
      if (!moved) return;
      const box = outsideRef?.current?.getBoundingClientRect();
      const outside = box
        ? event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom
        : false;
      const next = { ...current, dx, dy, moved, outside, target: outside ? undefined : hexAt(event.clientX, event.clientY) };
      dragRef.current = next;
      setDrag(next);
    };

    const end = (event: PointerEvent) => {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current?.moved || event.type === 'pointercancel') return;
      // The click that follows a drag must not open the link
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      if (current.outside) onDropOutside?.(current.id);
      else if (current.target && !hexEquals(current.target, current.origin)) onDrop?.(current.id, current.target);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [dragging, hexAt, outsideRef, onDrop, onDropOutside]);

  const startDrag = (event: ReactPointerEvent, node: BookmarkNode) => {
    if (!editable || event.button !== 0 || (event.target as Element).closest('.hex-badge')) return;
    // No text selection while dragging with a mouse; clicks still go through
    if (event.pointerType === 'mouse') event.preventDefault();
    const next: DragState = {
      id: node.id, origin: node.pos, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false, outside: false,
    };
    dragRef.current = next;
    setDrag(next);
  };

  const active = drag?.moved ? drag : null;
  const target = active ? active.target : highlight;
  const hit = target ? nodes.find((node) => node.id !== active?.id && hexEquals(node.pos, target)) : undefined;
  const outcome = active?.target ? dropOutcome(nodes, active.id, active.target, canCreateFolders) : undefined;
  const atOrigin = Boolean(active?.target && hexEquals(active.target, active.origin));

  const hitClass = (node: BookmarkNode) => {
    if (hit?.id !== node.id) return '';
    if (!active) return node.kind === 'folder' ? ' is-into' : '';
    return { move: '', swap: ' is-swap', folder: ' is-merge', into: ' is-into' }[outcome ?? 'move'];
  };

  const hint = (() => {
    if (!active) return undefined;
    if (active.outside) {
      const origin = place(active.origin);
      return {
        text: 'Aus dem Ordner nehmen',
        style: { left: Number(origin.left) + HEX_WIDTH / 2 + active.dx / scale, top: Number(origin.top) + HEX_HEIGHT + active.dy / scale },
      };
    }
    if (!active.target || !outcome || atOrigin) return undefined;
    const cell = place(active.target);
    return { text: HINTS[outcome], style: { left: Number(cell.left) + HEX_WIDTH / 2, top: Number(cell.top) + HEX_HEIGHT - 2 } };
  })();

  return (
    <div
      className={`hex-board${editable ? ' is-editable' : ''}${active ? ' is-dragging' : ''}`}
      style={{ width: layout.width * scale, height: layout.height * scale }}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        ref={innerRef}
        className="hex-board__inner"
        style={{ width: layout.width, height: layout.height, transform: scale === 1 ? undefined : `scale(${scale})` }}
      >
        {layout.ghosts.map((cell) => (
          <HexOutline key={hexKey(cell)} style={place(cell)} />
        ))}
        {active && <HexOutline style={place(active.origin)} className="is-origin" />}
        {target && !hit && !atOrigin && <HexOutline style={place(target)} className="is-target" />}

        {nodes.map((node) => {
          const isDragged = active?.id === node.id;
          return (
            <div
              key={node.id}
              className={`hex-slot${isDragged ? ' is-dragged' : ''}${hitClass(node)}`}
              style={{
                ...place(node.pos),
                transform: isDragged ? `translate(${active.dx / scale}px, ${active.dy / scale}px)` : undefined,
              }}
              onPointerDown={(event) => startDrag(event, node)}
            >
              {node.kind === 'link' ? (
                <LinkHex link={node} />
              ) : (
                <FolderHex folder={node} onOpen={() => onOpenFolder?.(node)} />
              )}
              {editable && (
                <span className="hex-badges">
                  <button
                    type="button"
                    className="hex-badge hex-badge--remove"
                    aria-label={node.kind === 'link' ? `${node.title} entfernen` : `Ordner ${node.name} auflösen`}
                    title={node.kind === 'link' ? 'Entfernen' : 'Ordner auflösen'}
                    onClick={() => onRemove?.(node)}
                  >
                    <Icon name="close" size={11} />
                  </button>
                  {node.kind === 'link' && (
                    <button
                      type="button"
                      className="hex-badge hex-badge--edit"
                      aria-label={`${node.title} bearbeiten`}
                      title="Bearbeiten"
                      onClick={() => onEdit?.(node)}
                    >
                      <Icon name="pencil" size={11} />
                    </button>
                  )}
                </span>
              )}
            </div>
          );
        })}

        {hint && (
          <span className="hex-hint" style={hint.style}>
            {hint.text}
          </span>
        )}
      </div>
    </div>
  );
}

function HexOutline({ style, className }: { style: CSSProperties; className?: string }) {
  return (
    <svg className={`hex-ghost${className ? ` ${className}` : ''}`} style={style} viewBox={VIEW_BOX} aria-hidden="true">
      <path d={SHAPE} />
    </svg>
  );
}

function HexShape() {
  return (
    <svg className="hex-node__shape" viewBox={VIEW_BOX} aria-hidden="true">
      <path d={SHAPE} />
    </svg>
  );
}

function LinkHex({ link }: { link: BookmarkLink }) {
  return (
    <a className="hex-node" href={link.url} draggable={false} title={`${link.title} · ${hostOf(link.url)}`}>
      <HexShape />
      <Favicon url={link.url} title={link.title} />
      <span className="hex-node__title">{link.title}</span>
    </a>
  );
}

function FolderHex({ folder, onOpen }: { folder: BookmarkFolder; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="hex-node hex-node--folder"
      aria-label={`Ordner ${folder.name}, ${folder.items.length} Lesezeichen`}
      onClick={onOpen}
    >
      <HexShape />
      <span className="hex-folder__preview">
        {folder.items.slice(0, 4).map((item) => (
          <Favicon key={item.id} url={item.url} title={item.title} size="sm" />
        ))}
      </span>
      <span className="hex-node__title">{folder.name}</span>
    </button>
  );
}
