import { Icon } from "@/components/ui/Icon";

export interface AppraisalAttachmentLike {
  id: number;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

function formatUploadedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Read-only list of an appraisal request's supporting documents — shared by
 * every reviewer surface (HoD's Appraisal Requests detail, HR's Employee
 * reviews detail) so "where are the uploaded files shown" only needs
 * answering once. Faculty's own submission screen has its own richer
 * upload/remove-capable panel (AttachmentsPanel) since that flow can also
 * mutate the list, not just display it.
 */
export function AppraisalAttachmentsList({ attachments }: { attachments: AppraisalAttachmentLike[] }) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted">No supporting documents were attached to this request.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((a) => (
        <li key={a.id}>
          <a
            href={a.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg border border-divider bg-surface px-3 py-2 text-sm hover:bg-surface-tint"
          >
            <Icon name="description" size={16} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate font-medium text-body">{a.file_name}</span>
            <span className="shrink-0 text-xs text-subtle">{formatUploadedAt(a.uploaded_at)}</span>
            <Icon name="open_in_new" size={14} className="shrink-0 text-muted" />
          </a>
        </li>
      ))}
    </ul>
  );
}
