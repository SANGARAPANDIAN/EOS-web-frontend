"use client";

import { Icon } from "@/components/ui/Icon";
import { Modal, Button, Badge } from "@/modules/admin/components/ui";
import type { EResource } from "@/modules/library/api/eResources";

interface EResourcePreviewModalProps {
  resource: EResource | null;
  onClose: () => void;
}

// Browsers render these inline via <iframe> without a plugin; everything
// else (EPUB, MOBI, DOCX) has no native in-browser renderer, so those get an
// "open elsewhere" fallback instead of a blank/broken frame.
const INLINE_PREVIEWABLE_FORMATS = new Set(["PDF"]);

export function EResourcePreviewModal({ resource, onClose }: EResourcePreviewModalProps) {
  if (!resource) return null;

  const canPreviewInline = resource.format ? INLINE_PREVIEWABLE_FORMATS.has(resource.format) : false;

  return (
    <Modal
      open={resource !== null}
      onClose={onClose}
      title={resource.title}
      subtitle={[resource.category_name, resource.format, resource.pages ? `${resource.pages} pages` : null]
        .filter(Boolean)
        .join(" · ")}
      widthClassName="max-w-4xl"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Badge tone={resource.publish_state === "published" ? "success" : "neutral"}>
            {resource.publish_state === "published" ? "Published" : "Draft"}
          </Badge>
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="secondary">
              <Icon name="open_in_new" size={16} /> Open in new tab
            </Button>
          </a>
        </div>

        {canPreviewInline ? (
          <iframe
            src={resource.url}
            title={resource.title}
            className="h-[70vh] w-full rounded-admin-lg border border-admin-border bg-admin-tint"
          />
        ) : (
          <div className="flex h-[70vh] flex-col items-center justify-center gap-3 rounded-admin-lg border border-dashed border-admin-border bg-admin-tint text-center">
            <Icon name="description" size={40} className="text-admin-muted" />
            <div className="text-sm text-admin-muted">
              {resource.format
                ? `${resource.format} files can't be previewed inline — open it in a new tab instead.`
                : "This file can't be previewed inline — open it in a new tab instead."}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
