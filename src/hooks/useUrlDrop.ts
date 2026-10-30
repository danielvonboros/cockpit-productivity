import { useRef, useState, type DragEvent } from 'react';
import { mayCarryLink, readDroppedLink, type DroppedLink } from '../lib/links';

/**
 * Accepts links dragged in from outside: the icon in the address bar, links on
 * other pages, browser bookmarks. Tile drags inside the dashboard are ignored.
 */
export function useUrlDrop(onLink: (link: DroppedLink, event: DragEvent) => void, onHover?: (event: DragEvent) => void) {
  const [isOver, setOver] = useState(false);
  // Enter/leave also fire for every child, so count them
  const depth = useRef(0);

  const handlers = {
    onDragEnter: (event: DragEvent) => {
      if (!mayCarryLink(event.dataTransfer.types)) return;
      depth.current += 1;
      setOver(true);
    },
    onDragOver: (event: DragEvent) => {
      if (!mayCarryLink(event.dataTransfer.types)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
      onHover?.(event);
    },
    onDragLeave: (event: DragEvent) => {
      if (!mayCarryLink(event.dataTransfer.types)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    },
    onDrop: (event: DragEvent) => {
      if (!mayCarryLink(event.dataTransfer.types)) return;
      event.preventDefault();
      event.stopPropagation();
      depth.current = 0;
      setOver(false);
      const link = readDroppedLink(event.dataTransfer);
      if (link) onLink(link, event);
    },
  };

  return { isOver, handlers };
}
