/** Marks the dashboard's own tile drags, so they are never mistaken for a dropped link */
export const TILE_DRAG_TYPE = 'application/x-cockpit-tile';

/** Accepts "example.com" as well as full URLs; undefined if it can't be a web address */
export function normalizeUrl(input: string): string | undefined {
  const value = input.trim();
  if (!value || /\s/.test(value)) return undefined;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** "https://www.notion.so/…" → "Notion" */
export function titleFromUrl(url: string): string {
  const labels = new URL(url).hostname.replace(/^www\./, '').split('.');
  const name = labels.length > 1 ? labels[labels.length - 2] : labels[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** Whether a drag may carry a link (its data can only be read on drop) */
export function mayCarryLink(types: readonly string[]): boolean {
  if (types.includes(TILE_DRAG_TYPE)) return false;
  return types.includes('text/uri-list') || types.includes('text/x-moz-url') || types.includes('text/plain');
}

export interface DroppedLink {
  url: string;
  title?: string;
}

/**
 * Reads a link from a drop: the address-bar icon, a link on another page or a
 * browser bookmark all deliver text/uri-list, often with the page title as HTML.
 */
export function readDroppedLink(data: DataTransfer): DroppedLink | undefined {
  const candidates: string[] = [];
  let title: string | undefined;

  // Firefox: "url\ntitle"
  const mozUrl = data.getData('text/x-moz-url');
  if (mozUrl) {
    const [url, name] = mozUrl.split(/\r?\n/);
    candidates.push(url);
    title = name?.trim() || undefined;
  }
  candidates.push(...data.getData('text/uri-list').split(/\r?\n/).filter((line) => line && !line.startsWith('#')));
  candidates.push(data.getData('text/plain'));

  const url = candidates.map((candidate) => normalizeUrl(candidate)).find(Boolean);
  if (!url) return undefined;

  if (!title) {
    const html = data.getData('text/html');
    // Parsed into an inert document; nothing from it is rendered or run
    const text = html ? new DOMParser().parseFromString(html, 'text/html').querySelector('a')?.textContent?.trim() : '';
    if (text && !normalizeUrl(text)) title = text;
  }
  return { url, title: title?.slice(0, 80) };
}
