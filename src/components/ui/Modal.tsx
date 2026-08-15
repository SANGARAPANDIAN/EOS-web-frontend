import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Centered overlay dialog — backdrop (click to dismiss) + a card with a
 * header (title/subtitle + close button) and a body the caller fully
 * controls, so a form's own field grid and footer buttons live in
 * `children` rather than being baked in here.
 *
 * Rendered via a portal straight to `document.body`: every page's content
 * well sits inside an `animate-pop-in` (CSS `animation`) ancestor, and an
 * element with an animated `transform` becomes a containing block for its
 * `position: fixed` descendants — so without the portal, the backdrop would
 * only cover that ancestor's box instead of the full viewport. Safe here
 * because `open` starts false and only ever flips true from a browser
 * event, i.e. `document` is always defined by the time this actually
 * portals — never during server rendering.
 */
export function Modal({ open, onClose, title, subtitle, children, className }: ModalProps) {
  if (!open) return null;
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,46,.42)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-[560px] max-h-[86vh] overflow-y-auto rounded-modal bg-surface shadow-modal animate-pop-in",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-5 border-b border-divider px-7 py-5">
          <div>
            <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
          </div>
          <IconButton icon="close" onClick={onClose} className="shrink-0" />
        </div>
        <div className="px-7 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
