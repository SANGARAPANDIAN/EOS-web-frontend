"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Faculty } from "@/modules/admin/api/faculty";
import { CARD_ASPECT, renderFacultyCardImages } from "@/modules/admin/lib/id-card-image";

interface FlipIdCardProps {
  /** Must carry the back-side fields (DOB/address/etc.) — a summary list
   * row isn't enough; pass a fetchFacultyById() result. */
  faculty: Faculty;
  /** Rendered width in px — height follows the card's real aspect ratio. */
  width?: number;
}

/**
 * A floating, click-to-flip preview of exactly the PNG that ends up in the
 * printed PDF — both are drawn by the same renderFacultyCardImages() call,
 * so there's no separately hand-built "preview version" of the card design
 * that could ever drift out of sync with what actually prints.
 *
 * Render with `key={faculty.id}` at the call site when the previewed person
 * can change (e.g. a picker) — that remounts this component with a clean
 * "loading"/"front-facing" state instead of showing the previous person's
 * card while the new one is still being drawn.
 */
export function FlipIdCard({ faculty, width = 220 }: FlipIdCardProps) {
  const [images, setImages] = useState<{ front: string; back: string } | null>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    renderFacultyCardImages(faculty).then((result) => {
      if (!cancelled) setImages(result);
    });
    return () => {
      cancelled = true;
    };
    // faculty.id is enough to key the re-render — a new object with the same
    // id (e.g. a fresh fetch) is the same card and shouldn't re-flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faculty.id]);

  const height = Math.round(width / CARD_ASPECT);

  function toggleFlip() {
    if (images) setFlipped((f) => !f);
  }

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        role="button"
        tabIndex={0}
        aria-label="Flip card to see the other side"
        onClick={toggleFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleFlip();
          }
        }}
        className="cursor-pointer outline-none"
        style={{ width, height, perspective: 1400 }}
      >
        <div
          className="relative size-full transition-transform duration-500 ease-out"
          style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
        >
          {images ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- a canvas-rendered data URL, not an optimizable asset */}
              <img
                src={images.front}
                alt="ID card front"
                className="absolute inset-0 size-full rounded-admin-lg border border-admin-border object-cover shadow-admin-hover"
                style={{ backfaceVisibility: "hidden" }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- a canvas-rendered data URL, not an optimizable asset */}
              <img
                src={images.back}
                alt="ID card back"
                className="absolute inset-0 size-full rounded-admin-lg border border-admin-border object-cover shadow-admin-hover"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              />
            </>
          ) : (
            <div className="absolute inset-0 size-full animate-pulse rounded-admin-lg border border-admin-border bg-admin-tint" />
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={toggleFlip}
        disabled={!images}
        className="flex items-center gap-1.5 text-xs font-semibold text-admin-primary enabled:hover:text-admin-primary-dark disabled:opacity-40"
      >
        <Icon name="flip" size={15} />
        {flipped ? "Show front" : "Show back"}
      </button>
    </div>
  );
}
