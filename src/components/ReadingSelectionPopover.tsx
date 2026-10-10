import { createPortal } from "react-dom";
import type { ReadingSelection } from "../lib/readingSelection";

type ReadingSelectionPopoverProps = {
  popup: ReadingSelection | null;
  bookmarkLabel: string;
  saveLabel: string;
  onBookmark: () => void;
  onSave: () => void;
};

export default function ReadingSelectionPopover({
  popup,
  bookmarkLabel,
  saveLabel,
  onBookmark,
  onSave,
}: ReadingSelectionPopoverProps) {
  if (!popup) return null;

  return createPortal(
    <div
      id="bookmark-popover"
      role="menu"
      className="fixed z-[80] flex max-w-[calc(100vw-1rem)] gap-px"
      style={{ left: popup.x, top: popup.y, transform: "translateX(-50%)" }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onBookmark}
        className="bg-blue-900 text-white font-bold text-sm px-4 py-3 md:px-4 md:py-2 rounded-l-full md:rounded-l-xl shadow-2xl md:shadow-xl flex items-center gap-2 hover:bg-blue-800 transition-all touch-manipulation"
      >
        🔖 {bookmarkLabel}
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onSave}
        className="bg-green-600 text-white font-bold text-sm px-4 py-3 md:px-4 md:py-2 rounded-r-full md:rounded-r-xl shadow-2xl md:shadow-xl flex items-center gap-2 hover:bg-green-700 transition-all touch-manipulation"
      >
        💾 {saveLabel}
      </button>
    </div>,
    document.body
  );
}
