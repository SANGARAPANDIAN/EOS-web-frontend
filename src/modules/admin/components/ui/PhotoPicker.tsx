"use client";

import { useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

interface PhotoPickerProps {
  photoDataUrl?: string | null;
  photoLabel?: string;
  initials: string;
  tone?: { bg: string; fg: string };
  avatarClassName?: string;
  isUploading?: boolean;
  onPick: (file: File) => void;
  onRemove?: () => void;
}

/** Avatar-with-pencil-badge + remove-badge + "Change photo" button — presentational, callers own the actual upload logic. */
export function PhotoPicker({ photoDataUrl, photoLabel, initials, tone, avatarClassName, isUploading, onPick, onRemove }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <span
          className={cn(
            "flex size-20 items-center justify-center overflow-hidden rounded-admin-lg border border-admin-border text-xl font-bold",
            avatarClassName,
          )}
          style={photoDataUrl ? undefined : { background: tone?.bg ?? "#eaf0fb", color: tone?.fg ?? "#1d47ae" }}
        >
          {photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a preview/remote URL, not a local/optimizable asset
            <img src={photoDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title="Change photo"
          className="absolute -right-1.5 -bottom-1.5 grid size-7 cursor-pointer place-items-center rounded-admin-pill border border-admin-border bg-admin-canvas text-admin-primary shadow-admin-resting hover:bg-admin-tint-strong"
        >
          <Icon name="edit" size={14} />
        </button>
        {photoDataUrl && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove photo"
            className="absolute -top-1.5 -right-1.5 grid size-6 cursor-pointer place-items-center rounded-admin-pill border border-admin-danger-border bg-admin-canvas text-admin-danger hover:bg-admin-danger-bg"
          >
            <Icon name="close" size={13} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(file);
          }}
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="w-fit rounded-admin-sm border border-admin-border-hover px-3 py-1.5 text-[13px] font-semibold text-admin-ink hover:bg-admin-tint-strong disabled:opacity-60"
        >
          {isUploading ? "Uploading…" : photoDataUrl ? "Replace photo" : "Upload photo"}
        </button>
        <p className="text-xs text-admin-subtle">{photoLabel ?? "JPG, PNG or WebP, up to 3MB."}</p>
      </div>
    </div>
  );
}
