"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, SegmentedTabs, Button, Input, Select, Textarea, EmptyState, Icon } from "@/components/ui";
import {
  useMyHostelRoom,
  useCreateHostelComplaint,
  useCreateMessFeedback,
  type HostelComplaintCategory,
} from "@/modules/student/api/hostel";
import { ApiError } from "@/types/api";

type Tab = "complaints" | "mess";

const COMPLAINT_CATEGORIES: HostelComplaintCategory[] = ["plumbing", "electrical", "carpentry", "network", "mess", "facilities", "other"];

const RATING_LABELS = ["Needs improvement", "Satisfactory", "Good", "Very good", "Excellent"];

function ComplaintForm() {
  const createComplaint = useCreateHostelComplaint();
  const [category, setCategory] = useState<HostelComplaintCategory | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (category === "") return;
    setError(null);
    try {
      await createComplaint.mutateAsync({ category, title, description: description || undefined });
      setSuccess(true);
      setCategory("");
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <Card className="max-w-[520px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-bold text-muted">Category</label>
          <Select required value={category} onChange={(e) => setCategory(e.target.value as HostelComplaintCategory)}>
            <option value="">Select a category</option>
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-bold text-muted">Title</label>
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Brief summary" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-bold text-muted">Description</label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" />
        </div>

        {error && (
          <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
            {error}
          </div>
        )}
        {success && <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary-dark">Complaint submitted.</div>}

        <Button type="submit" disabled={category === "" || !title.trim() || createComplaint.isPending}>
          {createComplaint.isPending ? "Submitting…" : "Submit complaint"}
        </Button>
      </form>
    </Card>
  );
}

function MessFeedbackForm() {
  const createFeedback = useCreateMessFeedback();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!rating) return;
    setError(null);
    try {
      await createFeedback.mutateAsync({ rating, comment: comment || undefined });
      setSuccess(true);
      setRating(null);
      setComment("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <Card className="max-w-[520px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11.5px] font-bold text-muted">How was the mess food?</label>
          <div className="flex flex-wrap gap-2">
            {RATING_LABELS.map((label, i) => {
              const value = i + 1;
              const active = rating === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`rounded-[9px] border px-3 py-2 text-[12.5px] font-bold transition-colors ${
                    active ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-body hover:bg-nav-hover"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-bold text-muted">Comments</label>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional" />
        </div>

        {error && (
          <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
            {error}
          </div>
        )}
        {success && <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary-dark">Feedback submitted, thank you.</div>}

        <Button onClick={handleSubmit} disabled={!rating || createFeedback.isPending} className="self-start">
          {createFeedback.isPending ? "Submitting…" : "Submit feedback"}
        </Button>
      </div>
    </Card>
  );
}

export default function HostelPage() {
  const room = useMyHostelRoom();
  const [tab, setTab] = useState<Tab>("complaints");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Hostel</h1>

      {room.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !room.data?.is_hostel_resident ? (
        <Card>
          <EmptyState message="You are not currently assigned a hostel room." />
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-[10px] bg-icon-chip">
              <Icon name="apartment" size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-ink">
                {room.data.hostel_name} · Room {room.data.room_number}
              </div>
              <div className="text-[12.5px] text-muted">
                {room.data.room_type_name} {room.data.mess_type && `· ${room.data.mess_type} mess`}
              </div>
            </div>
            <Link href="/student/leave">
              <Button variant="secondary">Hostel leave</Button>
            </Link>
            <Link href="/student/inout">
              <Button variant="secondary">Outings</Button>
            </Link>
          </div>
        </Card>
      )}

      {room.data?.is_hostel_resident && (
        <>
          <SegmentedTabs
            options={[
              { key: "complaints", label: "Complaints" },
              { key: "mess", label: "Mess feedback" },
            ]}
            value={tab}
            onChange={(k) => setTab(k as Tab)}
            className="self-start"
          />
          {tab === "complaints" ? <ComplaintForm /> : <MessFeedbackForm />}
        </>
      )}
    </div>
  );
}
