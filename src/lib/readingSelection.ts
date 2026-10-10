export const READING_SELECTION_ATTR = "data-reading-selection";

export type ReadingSelection = {
  itemId: string;
  text: string;
  x: number;
  y: number;
};

const POPOVER_HEIGHT = 48;
const POPOVER_HALF_WIDTH = 148;

/** Keep the menu next to the highlight and inside the visible screen. */
export function placeReadingPopover(rect: Pick<DOMRect, "left" | "top" | "width" | "bottom">): { x: number; y: number } {
  const margin = 8;
  const minTop = window.innerWidth < 768 ? 68 : margin;
  let y = rect.top - POPOVER_HEIGHT - margin;
  if (y < minTop) y = rect.bottom + margin;
  const maxY = window.innerHeight - POPOVER_HEIGHT - margin;
  if (y > maxY) y = Math.max(minTop, maxY);

  let x = rect.left + rect.width / 2;
  const minX = margin + POPOVER_HALF_WIDTH;
  const maxX = window.innerWidth - margin - POPOVER_HALF_WIDTH;
  x = maxX > minX ? Math.min(maxX, Math.max(minX, x)) : window.innerWidth / 2;
  return { x, y };
}

export function sameReadingSelection(a: ReadingSelection | null, b: ReadingSelection | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.itemId === b.itemId && a.text === b.text && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
}

/** Highlight inside a reading article, including a single word. */
export function readArticleSelection(): ReadingSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const text = selection.toString().replace(/\s+/g, " ").trim();
  if (!text) return null;

  const anchor = selection.anchorNode;
  if (!anchor) return null;
  const element = anchor.nodeType === Node.ELEMENT_NODE ? (anchor as Element) : anchor.parentElement;
  if (!element || element.closest('input, textarea, select, [contenteditable="true"]')) return null;

  const article = element.closest(`[${READING_SELECTION_ATTR}]`);
  const itemId = article?.getAttribute(READING_SELECTION_ATTR);
  if (!article || !itemId) return null;

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  const { x, y } = placeReadingPopover(rect);
  return { itemId, text, x, y };
}
