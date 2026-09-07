import { useCallback, useRef } from "react";

/**
 * Click-and-drag horizontal panning for a wide `overflow-x-auto` container —
 * e.g. a marks grid with one column per subject, where the number of columns
 * varies (a 6-paper exam vs. an 8-paper one) and the last column can end up
 * needing a scrollbar-only nudge to reach. Attach the returned ref to the
 * scrolling element; native scrollbar/trackpad/wheel scrolling keeps working
 * exactly as before, this only adds mouse-drag as an alternative.
 *
 * A callback ref, not a plain useRef+useEffect — the scrollable element is
 * typically only rendered once its data finishes loading (behind a
 * loading/empty conditional), so a one-shot effect on mount would capture a
 * still-null ref.current and never attach anything. A callback ref re-fires
 * exactly when the real node appears (or is swapped/unmounted), so this
 * works regardless of when that happens.
 *
 * Ignores drags starting on an interactive element (button/link/input/etc.)
 * so a register-no. link or a sort-header button still clicks normally.
 */
export function useDragScroll<T extends HTMLElement>() {
  const cleanup = useRef<() => void>(undefined);

  return useCallback((el: T | null) => {
    cleanup.current?.();
    cleanup.current = undefined;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, select, textarea")) return;
      isDown = true;
      startX = e.pageX;
      startScrollLeft = el!.scrollLeft;
      el!.classList.add("cursor-grabbing", "select-none");
    }

    function stopDragging() {
      if (!isDown) return;
      isDown = false;
      el!.classList.remove("cursor-grabbing", "select-none");
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDown) return;
      e.preventDefault();
      el!.scrollLeft = startScrollLeft - (e.pageX - startX);
    }

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", stopDragging);
    el.addEventListener("mouseleave", stopDragging);

    cleanup.current = () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseup", stopDragging);
      el.removeEventListener("mouseleave", stopDragging);
    };
  }, []);
}
