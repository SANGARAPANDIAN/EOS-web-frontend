"use client";

import { useState } from "react";
import { Card, Badge, Button, Select, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import {
  useCoeBroadcasts,
  useCreateCoeBroadcast,
  BROADCAST_CATEGORY_OPTIONS,
  BROADCAST_AUDIENCE_OPTIONS,
  type BroadcastCategory,
  type BroadcastAudience,
  type BroadcastStatus,
} from "@/modules/coe/api/coeBroadcasts";
import { formatRelativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const STATUS_BADGE: Record<BroadcastStatus, BadgeTone> = { draft: "neutral", scheduled: "accent", published: "accentDark" };

const AUDIENCE_LABEL = new Map(BROADCAST_AUDIENCE_OPTIONS.map((a) => [a.value, a.label]));

export default function CoeNotificationsPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BroadcastCategory>("announcement_new");
  const [audience, setAudience] = useState<BroadcastAudience>("all_students");
  const [sendPortal, setSendPortal] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<BroadcastCategory | null>(null);
  const broadcasts = useCoeBroadcasts({ category: categoryFilter });
  const createBroadcast = useCreateCoeBroadcast();

  function resetForm() {
    setTitle("");
    setMessage("");
    setScheduling(false);
    setScheduledAt("");
  }

  function handleSubmit(schedule: boolean) {
    setFormError(null);
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (schedule && !scheduledAt) {
      setFormError("Pick a date and time to schedule this for.");
      return;
    }
    createBroadcast.mutate(
      {
        title: title.trim(),
        category,
        audience,
        send_portal: sendPortal,
        send_email: sendEmail,
        send_sms: sendSms,
        message,
        scheduled_at: schedule ? new Date(scheduledAt).toISOString() : undefined,
      },
      {
        onSuccess: resetForm,
        onError: (err) => setFormError((err as Error).message),
      },
    );
  }

  const rows = broadcasts.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Notifications" subtitle="Exam announcements, timetable updates, hall ticket availability, results and revaluation alerts" />

      <div className="grid grid-cols-[1fr_1.3fr] gap-4 items-start">
        <Card>
          <div className="text-[15px] font-extrabold text-ink">Compose announcement</div>
          <p className="mt-0.5 text-[12px] text-subtle">Sent to the student portal, and optionally by email and SMS.</p>

          <div className="mt-4 flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">
                Title <span className="text-danger-fg">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hall tickets available from 18 Oct"
                className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Category</label>
              <Select value={category} onChange={(e) => setCategory(e.target.value as BroadcastCategory)}>
                {BROADCAST_CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Audience</label>
              <Select value={audience} onChange={(e) => setAudience(e.target.value as BroadcastAudience)}>
                {BROADCAST_AUDIENCE_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Channels</label>
              <div className="flex gap-2">
                {(
                  [
                    ["Portal", sendPortal, setSendPortal],
                    ["Email", sendEmail, setSendEmail],
                    ["SMS", sendSms, setSendSms],
                  ] as const
                ).map(([label, on, setOn]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setOn(!on)}
                    className={cn(
                      "rounded-pill border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
                      on ? "border-primary bg-accent-50 text-primary" : "border-border-default text-muted hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {(sendEmail || sendSms) && (
                <p className="mt-1.5 text-[11px] text-subtle">
                  {[sendEmail && "Email", sendSms && "SMS"].filter(Boolean).join(" and ")} will be recorded as requested — no email/SMS-sending integration exists in this backend yet, so only Portal actually
                  delivers.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Keep it under 400 characters for SMS delivery."
                className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
              />
            </div>

            {scheduling && (
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Send at</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
                />
              </div>
            )}

            {formError && <p className="text-[12px] text-danger-fg">{formError}</p>}

            <div className="flex items-center gap-2">
              <Button variant="primarySmall" disabled={createBroadcast.isPending} onClick={() => handleSubmit(false)}>
                {createBroadcast.isPending ? "Publishing…" : "Publish now"}
              </Button>
              {scheduling ? (
                <Button variant="secondary" className="w-auto" disabled={createBroadcast.isPending} onClick={() => handleSubmit(true)}>
                  {createBroadcast.isPending ? "Scheduling…" : "Confirm schedule"}
                </Button>
              ) : (
                <Button variant="secondary" className="w-auto" onClick={() => setScheduling(true)}>
                  Schedule
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Sent & scheduled</span>
            <Select value={categoryFilter ?? "all"} onChange={(e) => setCategoryFilter(e.target.value === "all" ? null : (e.target.value as BroadcastCategory))} className="w-44">
              <option value="all">All categories</option>
              {BROADCAST_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          {broadcasts.isLoading ? (
            <div className="p-4">
              <SkeletonRows count={5} />
            </div>
          ) : broadcasts.isError ? (
            <p className="px-5 py-6 text-[13px] text-danger-fg">{(broadcasts.error as Error).message}</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No announcements sent or scheduled yet.</p>
          ) : (
            <div className="flex flex-col">
              {rows.map((b) => {
                const channels = [b.send_portal && "Portal", b.send_email && "Email", b.send_sms && "SMS"].filter(Boolean).join(", ");
                const when = b.status === "scheduled" && b.scheduled_at ? b.scheduled_at : b.published_at ?? b.created_at;
                return (
                  <div key={b.id} className="border-b border-divider px-5 py-4 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-extrabold text-ink">{b.title}</span>
                      <Badge tone={STATUS_BADGE[b.status]}>{b.status.toUpperCase()}</Badge>
                    </div>
                    <div className="mt-0.5 text-[13px] text-body">{b.message}</div>
                    <div className="mt-1 text-[12px] text-subtle">
                      {AUDIENCE_LABEL.get(b.audience)} · {channels || "—"} · {formatRelativeTime(when)}
                      {b.status === "published" && ` · ${b.recipient_count} recipients`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
