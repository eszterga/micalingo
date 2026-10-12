import { useCallback, useEffect, useState } from "react";
import { readArticleSelection, sameReadingSelection, type ReadingSelection } from "./readingSelection";

/**
 * Show the bookmark menu from the document selection, not from mouseup on the article.
 * A selection that ends outside the paragraph, a phone selection handle, or the synthetic
 * click browsers fire after a touch would otherwise dismiss the menu before it can be used.
 */
export function useReadingSelectionPopup() {
  const [popup, setPopup] = useState<ReadingSelection | null>(null);

  const dismiss = useCallback(() => setPopup(null), []);

  useEffect(() => {
    let frame = 0;
    let lastTouch = 0;
    let selecting = false;
    let settleTimer = 0;

    const sync = () => {
      if (selecting) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = readArticleSelection();
        if (!next) return;
        setPopup((prev) => (sameReadingSelection(prev, next) ? prev : next));
      });
    };

    const onPointerDown = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.("#bookmark-popover")) return;
      // The mouse event that follows a touch selection is not a new tap.
      if (event.type === "mousedown" && Date.now() - lastTouch < 900) return;
      selecting = true;
      setPopup(null);
    };

    const finishSelection = () => {
      selecting = false;
      sync();
    };

    const onTouchEnd = () => {
      lastTouch = Date.now();
      finishSelection();
      // Phone selection handles often commit the highlight slightly after the finger lifts.
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(sync, 280);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPopup(null);
        return;
      }
      sync();
    };

    document.addEventListener("selectionchange", sync);
    document.addEventListener("mouseup", finishSelection);
    document.addEventListener("pointerup", finishSelection);
    document.addEventListener("pointercancel", finishSelection);
    document.addEventListener("touchend", onTouchEnd, true);
    document.addEventListener("keyup", onKey);
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    document.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      document.removeEventListener("selectionchange", sync);
      document.removeEventListener("mouseup", finishSelection);
      document.removeEventListener("pointerup", finishSelection);
      document.removeEventListener("pointercancel", finishSelection);
      document.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("keyup", onKey);
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
      document.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return { popup, dismiss };
}
