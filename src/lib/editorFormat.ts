/**
 * Read and rewrite formatting inside a contentEditable CMS editor.
 * Pasted Word/Docs HTML keeps its own font, size, and weight on nested spans,
 * which execCommand fontSize/fontName does not surface or override.
 */

export type FormatPatch = {
  fontWeight?: "400" | "700";
  fontStyle?: "italic" | "normal";
  underline?: boolean;
  strike?: boolean;
  fontFamily?: string;
  fontSize?: string;
};

export type FormatState = {
  bold: boolean;
  boldMixed: boolean;
  italic: boolean;
  italicMixed: boolean;
  underline: boolean;
  underlineMixed: boolean;
  strike: boolean;
  strikeMixed: boolean;
  fontFamily: string;
  fontMixed: boolean;
  fontSizePx: number | null;
  sizeMixed: boolean;
  block: string;
  align: string;
  color: string;
  highlight: string;
  highlightOn: boolean;
};

export const EMPTY_FORMAT: FormatState = {
  bold: false,
  boldMixed: false,
  italic: false,
  italicMixed: false,
  underline: false,
  underlineMixed: false,
  strike: false,
  strikeMixed: false,
  fontFamily: "",
  fontMixed: false,
  fontSizePx: null,
  sizeMixed: false,
  block: "",
  align: "",
  color: "#111827",
  highlight: "#fef08a",
  highlightOn: false,
};

export const FONT_PRESETS = [
  "Arial",
  "Calibri",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Segoe UI",
  "Courier New",
];

export const SIZE_PRESETS = [
  { px: 13, label: "Small (13px)" },
  { px: 16, label: "Normal (16px)" },
  { px: 24, label: "Large (24px)" },
  { px: 48, label: "Huge (48px)" },
];

const BLOCK_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "PRE", "BLOCKQUOTE", "DIV"]);

type StripFlags = {
  fontFamily: boolean;
  fontSize: boolean;
  fontWeight: boolean;
  fontStyle: boolean;
  underline: boolean;
  strike: boolean;
};

function elementOf(node: Node | null): HTMLElement | null {
  if (!node) return null;
  return node instanceof HTMLElement ? node : node.parentElement;
}

export function normalizeFontFamily(family: string): string {
  const first = family.split(",")[0]?.trim() ?? "";
  return first.replace(/^['"]+|['"]+$/g, "").trim();
}

const GENERIC_FONTS = new Set([
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "emoji",
  "math",
  "fangsong",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
  "-apple-system",
  "blinkmacsystemfont",
  "avenir",
  "helvetica",
  "helvetica neue",
]);

/** Families that come from the page default, not from an author-chosen font. */
export function isGenericFontFamily(family: string): boolean {
  const name = normalizeFontFamily(family).toLowerCase();
  return !name || GENERIC_FONTS.has(name);
}

/** Font set on this element or an ancestor inside the editor. Inherited page defaults count as none. */
export function explicitFontFamily(el: HTMLElement, editor: HTMLElement): string {
  let cur: HTMLElement | null = el;
  while (cur && cur !== editor.parentElement) {
    const raw = cur.style.fontFamily || cur.getAttribute("face") || "";
    const name = normalizeFontFamily(raw);
    if (name && !isGenericFontFamily(name)) return name;
    if (cur === editor) break;
    cur = cur.parentElement;
  }
  return "";
}

function rgbToHex(color: string): string {
  if (!color) return "#111827";
  if (color.startsWith("#")) {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color.slice(0, 7);
  }
  const match = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!match) return "#111827";
  return `#${[match[1], match[2], match[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}

function isTransparent(color: string): boolean {
  if (!color) return true;
  if (color === "transparent") return true;
  const match = color.match(/rgba\(\s*\d+[,\s]+\d+[,\s]+\d+[,\s/]+([\d.]+)\s*\)/i);
  if (match && Number(match[1]) === 0) return true;
  return false;
}

function decorationOn(el: HTMLElement, editor: HTMLElement, kind: "underline" | "line-through"): boolean {
  let cur: HTMLElement | null = el;
  while (cur) {
    if (kind === "underline" && cur.tagName === "U") return true;
    if (kind === "line-through" && (cur.tagName === "S" || cur.tagName === "STRIKE" || cur.tagName === "DEL")) return true;
    const own = `${cur.style.textDecoration} ${cur.style.textDecorationLine}`.toLowerCase();
    if (own.includes(kind)) return true;
    const computed = (getComputedStyle(cur).textDecorationLine || "").toLowerCase();
    if (computed.includes(kind)) return true;
    if (cur === editor) break;
    cur = cur.parentElement;
  }
  return false;
}

function blockOf(el: HTMLElement, editor: HTMLElement): string {
  let cur: HTMLElement | null = el;
  while (cur && cur !== editor) {
    if (BLOCK_TAGS.has(cur.tagName) && cur.tagName !== "DIV") return cur.tagName;
    if (cur.tagName === "DIV") return "DIV";
    cur = cur.parentElement;
  }
  return "";
}

function alignOf(el: HTMLElement, editor: HTMLElement): string {
  let cur: HTMLElement | null = el;
  while (cur && cur !== editor) {
    const inline = cur.style.textAlign;
    if (inline) return inline;
    cur = cur.parentElement;
  }
  const computed = getComputedStyle(el).textAlign || "";
  if (computed === "start") return "left";
  if (computed === "end") return "right";
  return computed;
}

function sampleElements(editor: HTMLElement): HTMLElement[] {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return [];
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return [];

  if (range.collapsed) {
    const el = elementOf(range.startContainer);
    return el && editor.contains(el) ? [el] : [];
  }

  const found: HTMLElement[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.textContent && node.textContent.trim()) {
      let hit = false;
      try {
        hit = range.intersectsNode(node);
      } catch {
        hit = false;
      }
      if (hit) {
        const el = elementOf(node);
        if (el) found.push(el);
      }
    }
    node = walker.nextNode();
  }
  if (found.length > 0) return found;
  const fallback = elementOf(range.startContainer);
  return fallback ? [fallback] : [];
}

function uniqueFlags(values: boolean[]): { on: boolean; mixed: boolean } {
  if (values.length === 0) return { on: false, mixed: false };
  const on = values.every(Boolean);
  const any = values.some(Boolean);
  return { on, mixed: any && !on };
}

export function readFormatState(editor: HTMLElement): FormatState {
  const samples = sampleElements(editor);
  if (samples.length === 0) return EMPTY_FORMAT;

  const bold = uniqueFlags(samples.map((el) => {
    const weight = getComputedStyle(el).fontWeight;
    const numeric = Number.parseInt(weight, 10);
    return weight === "bold" || (Number.isFinite(numeric) && numeric >= 600);
  }));
  const italic = uniqueFlags(samples.map((el) => {
    const style = getComputedStyle(el).fontStyle;
    return style === "italic" || style === "oblique";
  }));
  const underline = uniqueFlags(samples.map((el) => decorationOn(el, editor, "underline")));
  const strike = uniqueFlags(samples.map((el) => decorationOn(el, editor, "line-through")));

  const families = samples.map((el) => explicitFontFamily(el, editor));
  const familyKey = (value: string) => value.toLowerCase();
  const namedFamilies = families.filter((name) => name && !isGenericFontFamily(name));
  const uniqueFamilies = Array.from(new Set(namedFamilies.map(familyKey)));
  const sizes = samples.map((el) => Math.round(Number.parseFloat(getComputedStyle(el).fontSize) || 0)).filter((n) => n > 0);
  const uniqueSizes = Array.from(new Set(sizes));

  const first = samples[0];
  const color = rgbToHex(getComputedStyle(first).color);
  const background = getComputedStyle(first).backgroundColor;
  const highlightOn = !isTransparent(background) && rgbToHex(background) !== "#ffffff";

  return {
    bold: bold.on,
    boldMixed: bold.mixed,
    italic: italic.on,
    italicMixed: italic.mixed,
    underline: underline.on,
    underlineMixed: underline.mixed,
    strike: strike.on,
    strikeMixed: strike.mixed,
    fontFamily: uniqueFamilies.length === 1 ? namedFamilies[0] : "",
    fontMixed: uniqueFamilies.length > 1 || (namedFamilies.length > 0 && namedFamilies.length < families.length),
    fontSizePx: uniqueSizes.length === 1 ? uniqueSizes[0] : sizes[0] ?? null,
    sizeMixed: uniqueSizes.length > 1,
    block: blockOf(first, editor),
    align: alignOf(first, editor),
    color,
    highlight: highlightOn ? rgbToHex(background) : "#fef08a",
    highlightOn,
  };
}

function isBlock(el: HTMLElement): boolean {
  return /^(P|DIV|H[1-6]|LI|PRE|BLOCKQUOTE|TD|TH|TABLE|UL|OL|TR)$/.test(el.tagName);
}

function flagsFor(patch: FormatPatch): StripFlags {
  return {
    fontFamily: patch.fontFamily !== undefined,
    fontSize: patch.fontSize !== undefined,
    fontWeight: patch.fontWeight !== undefined,
    fontStyle: patch.fontStyle !== undefined,
    underline: patch.underline !== undefined,
    strike: patch.strike !== undefined,
  };
}

function cleanElement(el: HTMLElement, strip: StripFlags) {
  if (strip.fontFamily) {
    el.style.fontFamily = "";
    el.removeAttribute("face");
  }
  if (strip.fontSize) {
    el.style.fontSize = "";
    el.removeAttribute("size");
  }
  if (strip.fontWeight) el.style.fontWeight = "";
  if (strip.fontStyle) el.style.fontStyle = "";
  if (strip.underline || strip.strike) {
    const current = `${el.style.textDecorationLine || ""} ${el.style.textDecoration || ""}`.toLowerCase();
    let next = current;
    if (strip.underline) next = next.replace(/underline/g, "");
    if (strip.strike) next = next.replace(/line-through/g, "");
    next = next.replace(/\s+/g, " ").trim();
    el.style.textDecoration = "";
    el.style.textDecorationLine = next;
  }
  if (!el.getAttribute("style")?.trim()) el.removeAttribute("style");
}

function unwrap(el: HTMLElement) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function unwrapSemantics(root: ParentNode, strip: StripFlags) {
  const tags: string[] = [];
  if (strip.fontWeight) tags.push("b", "strong");
  if (strip.fontStyle) tags.push("i", "em");
  if (strip.underline) tags.push("u");
  if (strip.strike) tags.push("s", "strike", "del");
  if (strip.fontFamily || strip.fontSize) tags.push("font");

  for (const tag of tags) {
    const list = Array.from(root.querySelectorAll(tag));
    for (const node of list) {
      const el = node as HTMLElement;
      if (tag === "font" && (el.getAttribute("color") || el.style.color)) continue;
      unwrap(el);
    }
  }
}

function styleFromPatch(patch: FormatPatch): Record<string, string> {
  const style: Record<string, string> = {};
  if (patch.fontWeight) style.fontWeight = patch.fontWeight;
  if (patch.fontStyle) style.fontStyle = patch.fontStyle;
  if (patch.fontFamily) style.fontFamily = patch.fontFamily;
  if (patch.fontSize) style.fontSize = patch.fontSize;
  const deco: string[] = [];
  if (patch.underline) deco.push("underline");
  if (patch.strike) deco.push("line-through");
  if (deco.length > 0) style.textDecorationLine = deco.join(" ");
  return style;
}

function assignStyle(el: HTMLElement, style: Record<string, string>) {
  for (const [key, value] of Object.entries(style)) {
    el.style.setProperty(key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), value);
  }
}

function cleanRoot(root: ParentNode, strip: StripFlags) {
  const elements = Array.from(root.querySelectorAll("*"));
  for (const node of elements) cleanElement(node as HTMLElement, strip);
  unwrapSemantics(root, strip);
}

function applyToFragment(frag: DocumentFragment, patch: FormatPatch) {
  const strip = flagsFor(patch);
  cleanRoot(frag, strip);
  const style = styleFromPatch(patch);
  if (Object.keys(style).length === 0) return;

  const kids = Array.from(frag.childNodes);
  const hasBlock = kids.some((node) => node instanceof HTMLElement && isBlock(node));
  if (!hasBlock) {
    const span = document.createElement("span");
    assignStyle(span, style);
    for (const kid of kids) span.appendChild(kid);
    frag.appendChild(span);
    return;
  }
  for (const node of kids) {
    if (node instanceof HTMLElement && isBlock(node)) {
      assignStyle(node, style);
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const span = document.createElement("span");
      assignStyle(span, style);
      node.parentNode?.insertBefore(span, node);
      span.appendChild(node);
    }
  }
}

function blockElement(el: HTMLElement | null, editor: HTMLElement): HTMLElement | null {
  let cur = el;
  while (cur && cur !== editor) {
    if (/^(P|DIV|LI|H[1-6]|BLOCKQUOTE|TD|TH)$/.test(cur.tagName)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function applyAtCaret(editor: HTMLElement, patch: FormatPatch) {
  const sel = window.getSelection();
  const anchor = sel?.anchorNode ?? null;
  const el = elementOf(anchor);

  // A click with no drag still has a caret. Font and size should restyle that
  // paragraph so pasted, mixed runs become one type and one size.
  if (patch.fontFamily || patch.fontSize) {
    const block = blockElement(el, editor);
    if (block) {
      const range = document.createRange();
      range.selectNodeContents(block);
      applyToLiveRange(range, patch);
      return;
    }
  }

  const carrier = el?.closest("span,font,b,strong,i,em,u,s,strike");
  if (carrier instanceof HTMLElement && carrier !== editor && editor.contains(carrier)) {
    const range = document.createRange();
    // Replace the whole inline run so a parent <b>/<u>/<span> cannot keep the old style.
    range.selectNode(carrier);
    applyToLiveRange(range, patch);
    return;
  }

  editor.focus();
  try {
    document.execCommand("styleWithCSS", false, "true");
  } catch {
    /* ignore */
  }
  if (patch.fontWeight === "700" && !document.queryCommandState("bold")) document.execCommand("bold");
  if (patch.fontWeight === "400" && document.queryCommandState("bold")) document.execCommand("bold");
  if (patch.fontStyle === "italic" && !document.queryCommandState("italic")) document.execCommand("italic");
  if (patch.fontStyle === "normal" && document.queryCommandState("italic")) document.execCommand("italic");
  if (patch.underline === true && !document.queryCommandState("underline")) document.execCommand("underline");
  if (patch.underline === false && document.queryCommandState("underline")) document.execCommand("underline");
  if (patch.strike === true && !document.queryCommandState("strikeThrough")) document.execCommand("strikeThrough");
  if (patch.strike === false && document.queryCommandState("strikeThrough")) document.execCommand("strikeThrough");
  if (patch.fontFamily) document.execCommand("fontName", false, patch.fontFamily);
  if (patch.fontSize) {
    document.execCommand("fontSize", false, "7");
    const fonts = editor.querySelectorAll('font[size="7"]');
    const last = fonts[fonts.length - 1] as HTMLElement | undefined;
    if (last) {
      last.removeAttribute("size");
      last.style.fontSize = patch.fontSize;
    }
  }
}

function applyToLiveRange(range: Range, patch: FormatPatch) {
  const frag = range.extractContents();
  applyToFragment(frag, patch);
  const first = frag.firstChild;
  const last = frag.lastChild;
  range.insertNode(frag);
  if (!first || !last) return;
  const sel = window.getSelection();
  const next = document.createRange();
  next.setStartBefore(first);
  next.setEndAfter(last);
  sel?.removeAllRanges();
  sel?.addRange(next);
}

export function applyInlineFormat(editor: HTMLElement, patch: FormatPatch) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) {
    applyAtCaret(editor, patch);
    return;
  }
  applyToLiveRange(range, patch);
}

const LISTABLE = /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE)$/;

let savedRange: Range | null = null;
let savedEditor: HTMLElement | null = null;

function selectionInEditor(editor: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  if (node !== editor && !editor.contains(node)) return null;
  return range;
}

/**
 * Keep the editor selection across toolbar clicks.
 * "live" ignores a collapsed caret so a blur cannot wipe a real highlight.
 * "freeze" stores whatever is in the editor right now, including a caret.
 */
export function rememberEditorSelection(editor: HTMLElement | null, mode: "live" | "freeze" = "live") {
  if (!editor) return;
  const range = selectionInEditor(editor);
  if (!range) return;
  if (mode === "live" && range.collapsed && savedRange && !savedRange.collapsed && savedEditor === editor) return;
  savedEditor = editor;
  savedRange = range.cloneRange();
}

export function restoreEditorSelection(editor: HTMLElement): boolean {
  try {
    editor.focus({ preventScroll: true });
  } catch {
    editor.focus();
  }
  if (savedEditor !== editor || !savedRange) return false;
  try {
    const node = savedRange.commonAncestorContainer;
    if (node !== editor && !editor.contains(node)) return false;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRange.cloneRange());
    return true;
  } catch {
    return false;
  }
}

function finishEdit(editor: HTMLElement) {
  const range = selectionInEditor(editor);
  if (!range) {
    if (savedEditor === editor) savedRange = null;
    return;
  }
  savedEditor = editor;
  savedRange = range.cloneRange();
}

function blocksTouchingSelection(editor: HTMLElement): HTMLElement[] {
  const range = selectionInEditor(editor);
  if (!range) return [];
  const found: HTMLElement[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    const el = current as HTMLElement;
    if (LISTABLE.test(el.tagName)) {
      try {
        if (range.intersectsNode(el)) found.push(el);
      } catch {
        /* ignore detached nodes */
      }
    }
    current = walker.nextNode();
  }
  return found.filter((el) => !found.some((other) => other !== el && el.contains(other)));
}

function renameElement(el: HTMLElement, tag: string) {
  if (el.tagName === tag) return;
  const next = document.createElement(tag);
  for (const attr of Array.from(el.attributes)) next.setAttribute(attr.name, attr.value);
  while (el.firstChild) next.appendChild(el.firstChild);
  el.replaceWith(next);
}

function linesOf(block: HTMLElement): HTMLElement[] {
  const hasBr = Array.from(block.childNodes).some((node) => node.nodeName === "BR");
  if (!hasBr) return [block];
  const lines: HTMLElement[] = [];
  let bucket = document.createElement("div");
  for (const node of Array.from(block.childNodes)) {
    if (node.nodeName === "BR") {
      lines.push(bucket);
      bucket = document.createElement("div");
      continue;
    }
    bucket.appendChild(node);
  }
  lines.push(bucket);
  return lines.filter((line) => (line.textContent || "").replace(/\u00a0/g, "").trim() || line.querySelector("img,table"));
}

function placeList(blocks: HTMLElement[]) {
  const ul = document.createElement("ul");
  blocks[0].before(ul);
  for (const block of blocks) {
    if (block.tagName === "LI") {
      ul.appendChild(block);
      continue;
    }
    for (const line of linesOf(block)) {
      const li = document.createElement("li");
      while (line.firstChild) li.appendChild(line.firstChild);
      if (!(li.textContent || "").replace(/\u00a0/g, "").trim() && !li.querySelector("img,table")) continue;
      ul.appendChild(li);
    }
    if (block.isConnected) block.remove();
  }
  if (!ul.childElementCount) ul.remove();
}

function unwrapListItems(items: HTMLElement[]) {
  for (const li of items) {
    const parent = li.parentElement;
    const p = document.createElement("p");
    while (li.firstChild) p.appendChild(li.firstChild);
    li.replaceWith(p);
    if (parent && (parent.tagName === "UL" || parent.tagName === "OL") && parent.childElementCount === 0) {
      parent.remove();
    }
  }
}

function selectionToList(editor: HTMLElement) {
  const range = selectionInEditor(editor);
  if (!range || range.collapsed) {
    document.execCommand("insertUnorderedList");
    return;
  }
  const lines = range.toString().split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    document.execCommand("insertUnorderedList");
    return;
  }
  const ul = document.createElement("ul");
  for (const line of lines) {
    const li = document.createElement("li");
    li.textContent = line;
    ul.appendChild(li);
  }
  range.deleteContents();
  range.insertNode(ul);
}

/** Turn the current selection into a bullet list, or back into paragraphs. */
export function applyBulletList(editor: HTMLElement | null) {
  if (!editor) return;
  restoreEditorSelection(editor);
  const blocks = blocksTouchingSelection(editor);
  if (blocks.length > 0 && blocks.every((block) => block.tagName === "LI")) {
    unwrapListItems(blocks);
    finishEdit(editor);
    return;
  }
  if (blocks.length === 0) {
    const before = editor.innerHTML;
    let changed = false;
    try {
      changed = document.execCommand("insertUnorderedList");
    } catch {
      changed = false;
    }
    if (!changed || editor.innerHTML === before) selectionToList(editor);
    finishEdit(editor);
    return;
  }
  placeList(blocks);
  finishEdit(editor);
}

/** Apply H2 / H3 / P to every block in the selection, even when execCommand ignores it. */
export function applyBlockFormat(editor: HTMLElement, tag: string) {
  restoreEditorSelection(editor);
  const normalized = tag.replace(/[<>]/g, "").toUpperCase();
  const before = editor.innerHTML;
  let changed = false;
  try {
    changed = document.execCommand("formatBlock", false, `<${normalized.toLowerCase()}>`)
      || document.execCommand("formatBlock", false, normalized);
  } catch {
    changed = false;
  }
  if (!changed || editor.innerHTML === before) {
    const blocks = blocksTouchingSelection(editor).filter((block) => block.tagName !== "LI");
    for (const block of blocks) renameElement(block, normalized);
  }
  finishEdit(editor);
}

export function editorCommand(editor: HTMLElement, command: string, value?: string) {
  restoreEditorSelection(editor);
  if (command === "formatBlock" && value) {
    applyBlockFormat(editor, value);
    return;
  }
  if (command === "insertUnorderedList") {
    applyBulletList(editor);
    return;
  }
  document.execCommand(command, false, value);
  finishEdit(editor);
}
