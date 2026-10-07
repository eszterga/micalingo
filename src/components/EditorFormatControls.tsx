import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react";
import {
  applyEditorColor,
  getSelectionBookmark,
  type SelectionBookmark,
} from "../lib/richTextSelection";
import {
  EMPTY_FORMAT,
  FONT_PRESETS,
  SIZE_PRESETS,
  applyInlineFormat,
  editorCommand,
  isGenericFontFamily,
  normalizeFontFamily,
  readFormatState,
  rememberEditorSelection,
  restoreEditorSelection,
  type FormatState,
} from "../lib/editorFormat";

type Props = {
  editorRef: RefObject<HTMLDivElement | null>;
  onContentChange: () => void;
  children?: ReactNode;
};

const Divider = () => <div className="w-px h-6 bg-gray-300 self-center mx-1" />;

function buttonClass(active: boolean, mixed: boolean, extra = "") {
  const tone = active
    ? "bg-blue-600 text-white border-blue-700"
    : mixed
      ? "bg-amber-100 text-amber-950 border-amber-400"
      : "bg-white text-gray-800 border-gray-300 hover:bg-gray-200";
  return `px-3 py-1 border rounded text-sm shadow-sm transition-colors ${tone} ${extra}`;
}

export default function EditorFormatControls({ editorRef, onContentChange, children }: Props) {
  const [format, setFormat] = useState<FormatState>(EMPTY_FORMAT);

  const captureRange = () => {
    rememberEditorSelection(editorRef.current, "freeze");
  };

  const refresh = () => {
    const editor = editorRef.current;
    if (!editor) return;
    rememberEditorSelection(editor, "live");
    const sel = window.getSelection();
    if (!sel?.anchorNode || !editor.contains(sel.anchorNode)) return;
    setFormat(readFormatState(editor));
  };

  useEffect(() => {
    const editor = editorRef.current;
    const onSelection = () => refresh();
    const onPointerDown = (event: Event) => {
      const current = editorRef.current;
      if (!current) return;
      const target = event.target;
      if (target instanceof Node && current.contains(target)) return;
      rememberEditorSelection(current, "freeze");
    };
    const onUserCaret = () => rememberEditorSelection(editorRef.current, "freeze");
    document.addEventListener("selectionchange", onSelection);
    document.addEventListener("pointerdown", onPointerDown, true);
    editor?.addEventListener("keyup", onUserCaret);
    editor?.addEventListener("mouseup", onUserCaret);
    editor?.addEventListener("input", onSelection);
    return () => {
      document.removeEventListener("selectionchange", onSelection);
      document.removeEventListener("pointerdown", onPointerDown, true);
      editor?.removeEventListener("keyup", onUserCaret);
      editor?.removeEventListener("mouseup", onUserCaret);
      editor?.removeEventListener("input", onSelection);
    };
    // editorRef is stable; rebind when the modal mounts the editor node
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef]);

  const afterEdit = () => {
    onContentChange();
    refresh();
  };

  const withEditor = (fn: (editor: HTMLDivElement) => void) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreEditorSelection(editor);
    fn(editor);
    rememberEditorSelection(editor, "freeze");
    afterEdit();
  };

  const keepSelection = (event: MouseEvent) => {
    rememberEditorSelection(editorRef.current, "freeze");
    event.preventDefault();
  };

  const toggleBold = () => withEditor((editor) => {
    applyInlineFormat(editor, { fontWeight: format.bold && !format.boldMixed ? "400" : "700" });
  });
  const toggleItalic = () => withEditor((editor) => {
    applyInlineFormat(editor, { fontStyle: format.italic && !format.italicMixed ? "normal" : "italic" });
  });
  const toggleUnderline = () => withEditor((editor) => {
    applyInlineFormat(editor, { underline: !(format.underline && !format.underlineMixed) });
  });
  const toggleStrike = () => withEditor((editor) => {
    applyInlineFormat(editor, { strike: !(format.strike && !format.strikeMixed) });
  });

  const explicitFont = format.fontFamily && !isGenericFontFamily(format.fontFamily) ? format.fontFamily : "";
  const fonts = [...FONT_PRESETS];
  const knownFont = fonts.find((name) => name.toLowerCase() === explicitFont.toLowerCase());
  if (explicitFont && !knownFont) fonts.unshift(explicitFont);

  const sizeValue = format.sizeMixed ? "__mixed" : format.fontSizePx ? String(format.fontSizePx) : "";
  const knownSize = SIZE_PRESETS.some((preset) => preset.px === format.fontSizePx);
  const fontValue = format.fontMixed ? "__mixed" : (knownFont || explicitFont || "");

  const paragraphOn = format.block === "P" || format.block === "DIV";
  const oddBlock = format.block && !["P", "DIV", "H2", "H3"].includes(format.block);

  const captureSelection = () => getSelectionBookmark(editorRef.current);

  const paint = (command: "foreColor" | "hiliteColor", color: string, bookmark: SelectionBookmark | null) => {
    applyEditorColor(editorRef.current, command, color, bookmark);
    afterEdit();
  };

  return (
    <>
      <button type="button" title="Bold" onMouseDown={keepSelection} onClick={toggleBold} className={buttonClass(format.bold, format.boldMixed, "font-bold")}>B</button>
      <button type="button" title="Italic" onMouseDown={keepSelection} onClick={toggleItalic} className={buttonClass(format.italic, format.italicMixed, "italic")}>I</button>
      <button type="button" title="Underline" onMouseDown={keepSelection} onClick={toggleUnderline} className={buttonClass(format.underline, format.underlineMixed, "underline")}>U</button>
      <button type="button" title="Strikethrough" onMouseDown={keepSelection} onClick={toggleStrike} className={buttonClass(format.strike, format.strikeMixed, "line-through")}>S</button>
      <Divider />
      <button type="button" title="Align Left" onMouseDown={keepSelection} onClick={() => withEditor((editor) => editorCommand(editor, "justifyLeft"))} className={buttonClass(format.align === "left", false)}>⬅️</button>
      <button type="button" title="Align Center" onMouseDown={keepSelection} onClick={() => withEditor((editor) => editorCommand(editor, "justifyCenter"))} className={buttonClass(format.align === "center", false)}>↔️</button>
      <button type="button" title="Align Right" onMouseDown={keepSelection} onClick={() => withEditor((editor) => editorCommand(editor, "justifyRight"))} className={buttonClass(format.align === "right", false)}>➡️</button>
      <Divider />
      <button type="button" title="Heading 2" onMouseDown={keepSelection} onClick={() => withEditor((editor) => editorCommand(editor, "formatBlock", "H2"))} className={buttonClass(format.block === "H2", false, "font-bold")}>H2</button>
      <button type="button" title="Heading 3" onMouseDown={keepSelection} onClick={() => withEditor((editor) => editorCommand(editor, "formatBlock", "H3"))} className={buttonClass(format.block === "H3", false, "font-bold")}>H3</button>
      <button type="button" title="Paragraph" onMouseDown={keepSelection} onClick={() => withEditor((editor) => editorCommand(editor, "formatBlock", "P"))} className={buttonClass(paragraphOn, false)}>P</button>
      {oddBlock ? (
        <span className="px-2 py-1 text-xs font-bold rounded border border-amber-400 bg-amber-50 text-amber-900" title="Current block">{format.block}</span>
      ) : null}
      {children ? <><Divider />{children}</> : null}
      <Divider />
      <select
        aria-label="Font"
        title={format.fontMixed ? "Mixed fonts" : format.fontFamily || "Font"}
        value={fontValue}
        onMouseDown={captureRange}
        onChange={(event) => {
          const value = event.target.value;
          if (!value || value === "__mixed") return;
          withEditor((editor) => applyInlineFormat(editor, { fontFamily: normalizeFontFamily(value) || value }));
        }}
        className={`px-2 py-1 border rounded text-sm shadow-sm outline-none cursor-pointer max-w-[10rem] ${format.fontMixed ? "bg-amber-50 border-amber-400" : "bg-white border-gray-300"}`}
      >
        <option value="">Font</option>
        {format.fontMixed ? <option value="__mixed">Mixed</option> : null}
        {fonts.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      <select
        aria-label="Size"
        title={format.sizeMixed ? "Mixed sizes" : format.fontSizePx ? `${format.fontSizePx}px` : "Size"}
        value={sizeValue}
        onMouseDown={captureRange}
        onChange={(event) => {
          const value = event.target.value;
          if (!value || value === "__mixed") return;
          withEditor((editor) => applyInlineFormat(editor, { fontSize: `${value}px` }));
        }}
        className={`px-2 py-1 border rounded text-sm shadow-sm outline-none cursor-pointer ${format.sizeMixed ? "bg-amber-50 border-amber-400" : "bg-white border-gray-300"}`}
      >
        <option value="">Size</option>
        {format.sizeMixed ? <option value="__mixed">Mixed</option> : null}
        {format.fontSizePx && !knownSize && !format.sizeMixed ? (
          <option value={String(format.fontSizePx)}>{format.fontSizePx}px</option>
        ) : null}
        {SIZE_PRESETS.map((preset) => (
          <option key={preset.px} value={String(preset.px)}>{preset.label}</option>
        ))}
      </select>
      <ColorSwatch
        title="Text color"
        kind="foreColor"
        value={format.color || "#111827"}
        swatchClass="text-gray-500"
        captureSelection={captureSelection}
        onPick={paint}
      />
      <ColorSwatch
        title="Highlight"
        kind="hiliteColor"
        value={format.highlight || "#fef08a"}
        swatchClass={format.highlightOn ? "text-gray-800" : "text-gray-500 bg-yellow-200"}
        swatchStyle={format.highlightOn ? { backgroundColor: format.highlight } : undefined}
        captureSelection={captureSelection}
        onPick={paint}
        marked={format.highlightOn}
      />
    </>
  );
}

function ColorSwatch({
  title,
  kind,
  value,
  swatchClass,
  swatchStyle,
  marked,
  captureSelection,
  onPick,
}: {
  title: string;
  kind: "foreColor" | "hiliteColor";
  value: string;
  swatchClass: string;
  swatchStyle?: CSSProperties;
  marked?: boolean;
  captureSelection: () => SelectionBookmark | null;
  onPick: (command: "foreColor" | "hiliteColor", color: string, bookmark: SelectionBookmark | null) => void;
}) {
  const [bookmark, setBookmark] = useState<SelectionBookmark | null>(null);
  return (
    <div className={`flex items-center border rounded shadow-sm px-1 ${marked ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white"}`} title={title}>
      <span className={`text-xs px-1 font-serif ${swatchClass}`} style={swatchStyle}>A</span>
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#111827"}
        onMouseDown={() => {
          setBookmark(captureSelection());
        }}
        onInput={(event) => onPick(kind, (event.target as HTMLInputElement).value, bookmark)}
        onChange={(event) => onPick(kind, event.target.value, bookmark)}
        className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
      />
    </div>
  );
}
