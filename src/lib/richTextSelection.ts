/**
 * Helpers for contentEditable selection + color commands.
 * Native color inputs steal focus and invalidate live Ranges after the first
 * execCommand mutation — clone ranges and re-apply via bookmarks so recoloring works.
 */

export type SelectionBookmark = { start: number; end: number };

function isInsideEditor(node: Node | null, editor: HTMLElement): boolean {
  if (!node) return false;
  return editor === node || editor.contains(node);
}

/** Character offset from the start of `editor` to the given boundary. */
function getTextOffset(editor: HTMLElement, container: Node, offset: number): number {
  const pre = document.createRange();
  pre.selectNodeContents(editor);
  try {
    pre.setEnd(container, offset);
  } catch {
    return 0;
  }
  return pre.toString().length;
}

/** Walk text nodes to resolve a character offset back to a DOM position. */
function positionFromOffset(editor: HTMLElement, target: number): { node: Node; offset: number } {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let remaining = target;
  let last: Text | null = null;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    last = node;
    const len = node.data.length;
    if (remaining <= len) {
      return { node, offset: remaining };
    }
    remaining -= len;
  }

  if (last) return { node: last, offset: last.data.length };
  return { node: editor, offset: 0 };
}

export function getSelectionBookmark(editor: HTMLElement | null): SelectionBookmark | null {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!isInsideEditor(range.commonAncestorContainer, editor)) return null;

  const start = getTextOffset(editor, range.startContainer, range.startOffset);
  const end = getTextOffset(editor, range.endContainer, range.endOffset);
  if (start === end) return null;
  return { start, end };
}

export function restoreSelectionBookmark(
  editor: HTMLElement | null,
  bookmark: SelectionBookmark | null
): boolean {
  if (!editor || !bookmark) return false;
  try {
    const startPos = positionFromOffset(editor, bookmark.start);
    const endPos = positionFromOffset(editor, Math.max(bookmark.start, bookmark.end));
    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);

    editor.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    return !range.collapsed;
  } catch {
    return false;
  }
}

export function cloneCurrentSelection(editor: HTMLElement | null): Range | null {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!isInsideEditor(range.commonAncestorContainer, editor)) return null;
  if (range.collapsed) return null;
  return range.cloneRange();
}

export function restoreRange(editor: HTMLElement | null, range: Range | null): boolean {
  if (!editor || !range) return false;
  try {
    if (!isInsideEditor(range.commonAncestorContainer, editor)) return false;
    editor.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range.cloneRange());
    return true;
  } catch {
    return false;
  }
}

/**
 * Apply foreColor / hiliteColor to the bookmarked selection.
 * Uses styleWithCSS and character-offset bookmarks so repeated color picks
 * (Windows native palette) keep targeting the same text after DOM wraps.
 */
export function applyEditorColor(
  editor: HTMLElement | null,
  command: 'foreColor' | 'hiliteColor',
  color: string,
  bookmark: SelectionBookmark | null
): SelectionBookmark | null {
  if (!editor || !bookmark || !color) return bookmark;

  const restored = restoreSelectionBookmark(editor, bookmark);
  if (!restored) return bookmark;

  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* ignore */
  }

  // Clear prior color/highlight on the selection first so nested
  // <font>/<span style="..."> wrappers don't leave the old value winning.
  try {
    if (command === 'foreColor') {
      document.execCommand('foreColor', false, 'windowtext');
    } else {
      document.execCommand('hiliteColor', false, 'transparent');
    }
  } catch {
    /* ignore */
  }
  restoreSelectionBookmark(editor, bookmark);

  document.execCommand(command, false, color);

  // Prefer keeping the same logical selection for further recolors
  const next = getSelectionBookmark(editor);
  return next ?? bookmark;
}
