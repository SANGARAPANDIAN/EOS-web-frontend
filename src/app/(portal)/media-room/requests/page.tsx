"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, Card, EmptyState, Input, type BadgeTone } from "@/components/ui";
import {
  useMediaRequests,
  useReviewMediaRequest,
  useCreateMediaRequest,
  type MediaRequest,
  type MediaRequestStatus,
} from "@/modules/media-room/api/mediaRequests";
import { useUploadAttachment } from "@/modules/media-room/api/upload";
import { useVenues } from "@/modules/media-room/api/venues";
import { formatDayAndTime, formatDisplayDate } from "@/lib/utils/date";

const MEDIA_REQUEST_TYPES = ["Photography", "Videography", "Live Streaming", "Drone Coverage", "LED Display Support", "Sound System", "Stage Photography", "Event Highlights"];

const STATUS_TONE: Record<MediaRequestStatus, BadgeTone> = {
  pending: "accentDark",
  approved: "accent",
  rejected: "danger",
  delivered: "neutral",
};

const STATUS_LABEL: Record<MediaRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  delivered: "Delivered",
};

const FILTERS: { key: "all" | MediaRequestStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "delivered", label: "Delivered" },
  { key: "rejected", label: "Rejected" },
];

function DeliverModal({ request, onClose }: { request: MediaRequest; onClose: () => void }) {
  const upload = useUploadAttachment();
  const review = useReviewMediaRequest();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) {
      setError("Attach the final file to deliver.");
      return;
    }
    setError(null);
    try {
      const uploaded = await upload.mutateAsync(file);
      await review.mutateAsync({ id: request.id, status: "delivered", media_file_url: uploaded.url });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not deliver this request.");
    }
  }

  const busy = upload.isPending || review.isPending;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[440px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">Mark delivered</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <p className="text-[13.5px] text-body">
            Upload the final photo/video for <span className="font-bold">{request.event_name ?? "this request"}</span>. The requester gets a
            notification with the file once it's attached.
          </p>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">File</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full text-[13px]"
            />
          </div>
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={busy}>
            {busy ? "Uploading…" : "Deliver"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InternalRequestModal({ onClose }: { onClose: () => void }) {
  const create = useCreateMediaRequest();
  const venues = useVenues();

  const [description, setDescription] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venueId, setVenueId] = useState<number | undefined>(undefined);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleType(t: string) {
    setMediaTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function submit() {
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        description: description.trim(),
        event_name: eventName.trim() || undefined,
        event_date: eventDate || undefined,
        venue_id: venueId,
        coordinator_name: coordinatorName.trim() || undefined,
        contact_number: contactNumber.trim() || undefined,
        media_types: mediaTypes.length > 0 ? mediaTypes : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not raise this request.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">New internal request</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-[26px] py-[22px]">
          <p className="mb-4 text-[13px] text-muted">Raised by the Media Room itself — for internal coverage needs that don't come through a faculty or secretary request.</p>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What needs covering, and why"
                className="mt-1.5 w-full rounded-[9px] border border-border-default bg-surface px-3 py-2 text-[13.5px] text-body outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <Input placeholder="Event name" value={eventName} onChange={(e) => setEventName(e.target.value)} />
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <select
                value={venueId ?? ""}
                onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : undefined)}
                className="h-[42px] rounded-[9px] border border-border-default bg-surface px-3 text-[13.5px] text-body outline-none focus:border-primary"
              >
                <option value="">No venue</option>
                {(venues.data ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <Input placeholder="Coordinator name" value={coordinatorName} onChange={(e) => setCoordinatorName(e.target.value)} />
            </div>
            <Input placeholder="Contact number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Coverage needed</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {MEDIA_REQUEST_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`rounded-pill border px-3 py-1.5 text-[12.5px] font-bold transition-colors ${
                      mediaTypes.includes(t) ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft hover:bg-surface-tint"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <div className="mt-3 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Raising…" : "Raise request"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function MediaRequestsPage() {
  const [filter, setFilter] = useState<"all" | MediaRequestStatus>("all");
  const [query, setQuery] = useState("");
  const [deliverTarget, setDeliverTarget] = useState<MediaRequest | null>(null);
  const [showInternal, setShowInternal] = useState(false);
  const requests = useMediaRequests(filter === "all" ? undefined : filter);
  const review = useReviewMediaRequest();

  const rows = (requests.data?.data ?? []).filter((r) => {
    if (!query.trim()) return true;
    const haystack = `${r.event_name ?? ""} ${r.description} ${r.requested_by.name} ${r.coordinator_name ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Media requests</h1>
          <p className="mt-1 text-[13px] text-muted">Poster, video and coverage requests raised by faculty and department secretaries.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowInternal(true)}>
          + Internal request
        </Button>
      </div>

      {deliverTarget && <DeliverModal request={deliverTarget} onClose={() => setDeliverTarget(null)} />}
      {showInternal && <InternalRequestModal onClose={() => setShowInternal(false)} />}

      <div className="flex flex-wrap items-center gap-3">
        <Input className="min-w-[240px] max-w-[360px]" placeholder="Search event, requester or coordinator" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors ${
                filter === f.key ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft hover:bg-surface-tint"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[13px] text-muted">{rows.length} of {requests.data?.meta.total ?? 0} requests</span>
      </div>

      {requests.isLoading ? (
        <EmptyState message="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No media requests in this view." />
      ) : (
        <div className="flex flex-col gap-3.5">
          {rows.map((r) => (
            <Card data-mr-lift="1" key={r.id} className="transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    <span className="font-mono text-[12px] text-subtle">#{r.id} · {formatDayAndTime(r.created_at)}</span>
                  </div>
                  <div className="mt-2 text-[17px] font-extrabold text-ink">{r.event_name ?? "Untitled event"}</div>
                  <div className="mt-0.5 text-[13px] text-muted">
                    Raised by <span className="font-semibold text-body">{r.requested_by.name}</span>
                    {r.faculty?.designation ? ` · ${r.faculty.designation}` : ""}
                  </div>
                </div>
                {r.media_types.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {r.media_types.map((t) => (
                      <Badge key={t} tone="neutral">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <p className="mt-3 text-[13.5px] text-body">{r.description}</p>

              <div className="mt-3 grid grid-cols-4 gap-3 border-t border-divider pt-3 text-[12.5px]">
                <div>
                  <div className="font-bold uppercase tracking-[.05em] text-subtle">Event date</div>
                  <div className="mt-0.5 text-body">{r.event_date ? formatDisplayDate(r.event_date) : "—"}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-[.05em] text-subtle">Venue</div>
                  <div className="mt-0.5 text-body">{r.venue?.name ?? "—"}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-[.05em] text-subtle">Coordinator</div>
                  <div className="mt-0.5 text-body">{r.coordinator_name ?? "—"}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-[.05em] text-subtle">Contact</div>
                  <div className="mt-0.5 text-body">{r.contact_number ?? "—"}</div>
                </div>
              </div>

              {r.media_file_url && (
                <a href={r.media_file_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[13px] font-bold text-primary hover:underline">
                  View delivered file →
                </a>
              )}

              {r.status === "pending" && (
                <div className="mt-3 flex justify-end gap-2.5 border-t border-divider pt-3">
                  <button
                    type="button"
                    onClick={() => review.mutate({ id: r.id, status: "rejected" })}
                    disabled={review.isPending}
                    className="rounded-[7px] border border-danger-border px-3.5 py-2 text-[12.5px] font-bold text-danger-fg hover:bg-danger-bg"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => review.mutate({ id: r.id, status: "approved" })}
                    disabled={review.isPending}
                    className="rounded-[7px] bg-primary px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-primary-dark"
                  >
                    Approve
                  </button>
                </div>
              )}

              {r.status === "approved" && (
                <div className="mt-3 flex justify-end border-t border-divider pt-3">
                  <button
                    type="button"
                    onClick={() => setDeliverTarget(r)}
                    className="rounded-[7px] bg-primary px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-primary-dark"
                  >
                    Mark delivered
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
