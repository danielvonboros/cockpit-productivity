import type { BookmarkFolder, BookmarkLink, BookmarkNode, Hex, Id } from '../types/models';
import { firstFree, hexEquals, hexKey } from '../lib/hex';

/**
 * Pure operations on the bookmark space. Every node owns one hexagon cell in
 * its container (the top level or a folder); no two nodes share a cell.
 */

type Placed = { id: Id; pos: Hex };

const freeCell = (items: Placed[], near?: Hex) => firstFree(new Set(items.map((item) => hexKey(item.pos))), near);

const mapFolder = (nodes: BookmarkNode[], folderId: Id, change: (folder: BookmarkFolder) => BookmarkFolder) =>
  nodes.map((node) => (node.kind === 'folder' && node.id === folderId ? change(node) : node));

/** Folders disappear once their last bookmark is gone */
const pruneFolders = (nodes: BookmarkNode[]) => nodes.filter((node) => node.kind === 'link' || node.items.length > 0);

export function findFolder(nodes: BookmarkNode[], folderId: Id | undefined): BookmarkFolder | undefined {
  const node = nodes.find((item) => item.id === folderId);
  return node?.kind === 'folder' ? node : undefined;
}

export function countLinks(nodes: BookmarkNode[]): number {
  return nodes.reduce((sum, node) => sum + (node.kind === 'link' ? 1 : node.items.length), 0);
}

/** Puts a link at `at` (or the nearest free cell); dropped onto a folder it goes inside */
export function placeLink(nodes: BookmarkNode[], link: BookmarkLink, { folderId, at }: { folderId?: Id; at?: Hex }): BookmarkNode[] {
  const target = findFolder(nodes, folderId) ?? findFolder(nodes, at && nodes.find((node) => hexEquals(node.pos, at))?.id);
  if (target) {
    const near = target.id === folderId ? at : undefined;
    return mapFolder(nodes, target.id, (folder) => ({ ...folder, items: [...folder.items, { ...link, pos: freeCell(folder.items, near) }] }));
  }
  return [...nodes, { ...link, pos: freeCell(nodes, at) }];
}

/** Moves within one container; an occupied target swaps places */
function moveWithin<T extends Placed>(items: T[], id: Id, target: Hex): T[] {
  const dragged = items.find((item) => item.id === id);
  if (!dragged) return items;
  const hit = items.find((item) => item.id !== id && hexEquals(item.pos, target));
  return items.map((item) => {
    if (item.id === id) return { ...item, pos: target };
    if (hit && item.id === hit.id) return { ...item, pos: dragged.pos };
    return item;
  });
}

export type DropOutcome = 'move' | 'swap' | 'folder' | 'into';

/** What letting go of `id` over `target` would do – used for the live hint while dragging */
export function dropOutcome(items: BookmarkNode[], id: Id, target: Hex, canCreateFolders: boolean): DropOutcome {
  const dragged = items.find((node) => node.id === id);
  const hit = items.find((node) => node.id !== id && hexEquals(node.pos, target));
  if (!hit) return 'move';
  if (canCreateFolders && dragged?.kind === 'link') return hit.kind === 'link' ? 'folder' : 'into';
  return 'swap';
}

/**
 * Drops a node on a cell of its own container. On the top level a link on a
 * link becomes a new folder, a link on a folder goes inside; otherwise the two swap.
 */
export function dropNode(
  nodes: BookmarkNode[],
  id: Id,
  folderId: Id | undefined,
  target: Hex,
  newId: () => Id,
): { nodes: BookmarkNode[]; createdFolderId?: Id } {
  if (folderId) {
    return { nodes: mapFolder(nodes, folderId, (folder) => ({ ...folder, items: moveWithin(folder.items, id, target) })) };
  }

  const outcome = dropOutcome(nodes, id, target, true);
  const dragged = nodes.find((node) => node.id === id);
  const hit = nodes.find((node) => node.id !== id && hexEquals(node.pos, target));

  if (outcome === 'folder' && dragged?.kind === 'link' && hit?.kind === 'link') {
    const folder: BookmarkFolder = {
      kind: 'folder',
      id: newId(),
      name: 'Ordner',
      pos: hit.pos,
      items: [
        { ...hit, pos: { q: 0, r: 0 } },
        { ...dragged, pos: { q: 1, r: 0 } },
      ],
    };
    return { nodes: [...nodes.filter((node) => node.id !== id && node.id !== hit.id), folder], createdFolderId: folder.id };
  }

  if (outcome === 'into' && dragged?.kind === 'link' && hit?.kind === 'folder') {
    const rest = nodes.filter((node) => node.id !== id);
    return { nodes: mapFolder(rest, hit.id, (folder) => ({ ...folder, items: [...folder.items, { ...dragged, pos: freeCell(folder.items) }] })) };
  }

  return { nodes: moveWithin(nodes, id, target) };
}

/** Takes a link out of its folder and puts it next to the folder (or in its place, if it was the last one) */
export function moveOutOfFolder(nodes: BookmarkNode[], folderId: Id, linkId: Id): BookmarkNode[] {
  const folder = findFolder(nodes, folderId);
  const link = folder?.items.find((item) => item.id === linkId);
  if (!folder || !link) return nodes;
  const rest = pruneFolders(mapFolder(nodes, folderId, (item) => ({ ...item, items: item.items.filter((entry) => entry.id !== linkId) })));
  return [...rest, { ...link, pos: freeCell(rest, folder.pos) }];
}

export function removeLink(nodes: BookmarkNode[], linkId: Id): BookmarkNode[] {
  return pruneFolders(
    nodes
      .filter((node) => node.id !== linkId)
      .map((node) => (node.kind === 'folder' && node.items.some((item) => item.id === linkId)
        ? { ...node, items: node.items.filter((item) => item.id !== linkId) }
        : node)),
  );
}

/** Removes the folder but keeps its bookmarks, placed around where it was */
export function dissolveFolder(nodes: BookmarkNode[], folderId: Id): BookmarkNode[] {
  const folder = findFolder(nodes, folderId);
  if (!folder) return nodes;
  return folder.items.reduce<BookmarkNode[]>(
    (result, item) => [...result, { ...item, pos: freeCell(result, folder.pos) }],
    nodes.filter((node) => node.id !== folderId),
  );
}

export function updateLink(nodes: BookmarkNode[], linkId: Id, patch: Pick<BookmarkLink, 'title' | 'url'>): BookmarkNode[] {
  const change = (link: BookmarkLink) => (link.id === linkId ? { ...link, ...patch } : link);
  return nodes.map((node) => (node.kind === 'link' ? change(node) : { ...node, items: node.items.map(change) }));
}

export function renameFolder(nodes: BookmarkNode[], folderId: Id, name: string): BookmarkNode[] {
  return mapFolder(nodes, folderId, (folder) => ({ ...folder, name }));
}

// ── Older saves ────────────────────────────────────

interface LegacyGroup {
  id: Id;
  name: string;
  items: { id: Id; title: string; url: string }[];
}

/** Before folders there were named groups: one group becomes loose links, several become folders */
function migrateGroups(groups: LegacyGroup[]): BookmarkNode[] {
  const filled = groups.filter((group) => group.items.length > 0);
  const toLinks = (items: LegacyGroup['items']) =>
    items.reduce<BookmarkLink[]>((links, item) => [...links, { kind: 'link', ...item, pos: freeCell(links) }], []);
  if (filled.length <= 1) return toLinks(filled[0]?.items ?? []);
  return filled.reduce<BookmarkNode[]>(
    (nodes, group) => [...nodes, { kind: 'folder', id: group.id, name: group.name, items: toLinks(group.items), pos: freeCell(nodes) }],
    [],
  );
}

export function normalizeBookmarks(raw: unknown): BookmarkNode[] {
  if (!Array.isArray(raw)) return [];
  const isNode = (item: unknown) => typeof item === 'object' && item !== null && 'kind' in item;
  if (raw.every(isNode)) return raw as BookmarkNode[];
  return migrateGroups(raw.filter((item): item is LegacyGroup => typeof item === 'object' && item !== null && Array.isArray(item.items)));
}
