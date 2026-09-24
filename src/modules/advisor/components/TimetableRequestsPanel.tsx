"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  useTimetableRequests,
  useRespondToTimetableRequest,
  useCancelTimetableRequest,
  type TimetablePeriodRequest,
} from "@/modules/advisor/api/timetableRequests";
import { useMyCurrentSemesterSubjects } from "@/modules/advisor/api/employee";

function pill(status: TimetablePeriodRequest["status"]) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    pending: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E3A8A" },
    accepted: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
    rejected: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
    cancelled: { bg: "#F1F5F9", border: "#CBD5E1", color: "#94A3B8" },
  };
  const t = map[status] ?? map.pending;
  return { padding: "6px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11.5, fontWeight: 800 } as const;
}

function dateLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function requestSummary(r: TimetablePeriodRequest, perspective: "sent" | "received") {
  const other = perspective === "sent" ? r.to_faculty : r.from_faculty;
  if (r.request_type === "takeover") {
    return perspective === "sent"
      ? `You asked ${other.name} to cover Period ${r.primary_period.period_number} (${r.primary_period.subject.name})`
      : `${other.name} is asking you to cover Period ${r.primary_period.period_number} (${r.primary_period.subject.name})`;
  }
  // swap
  const mine = perspective === "sent" ? r.primary_period : r.secondary_period;
  const theirs = perspective === "sent" ? r.secondary_period : r.primary_period;
  return perspective === "sent"
    ? `You offered your Period ${mine?.period_number ?? r.primary_period.period_number} for ${other.name}'s Period ${theirs?.period_number ?? "—"}`
    : `${other.name} wants to swap their Period ${theirs?.period_number ?? r.primary_period.period_number} for your Period ${mine?.period_number ?? "—"}`;
}

function AcceptTakeoverInline({ request, onDone }: { request: TimetablePeriodRequest; onDone: () => void }) {
  const subjects = useMyCurrentSemesterSubjects();
  const mySubjectsForClass = (subjects.data?.subjects ?? []).filter((s) => s.class_id === request.class.id);
  const [choice, setChoice] = useState<string>(mySubjectsForClass[0] ? String(mySubjectsForClass[0].subject_id) : "keep");
  const respond = useRespondToTimetableRequest();

  function confirm() {
    respond.mutate(
      { id: request.id, decision: "accepted", covering_subject_id: choice === "keep" ? undefined : Number(choice) },
      { onSuccess: onDone },
    );
  }

  return (
    <div style={{ marginTop: 12, padding: 14, background: "#F8FAFC", border: "1px solid #E6EAF0", borderRadius: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>What will you teach in this period?</div>
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        style={{ width: "100%", marginTop: 8, height: 42, border: "1px solid #DDE3EC", borderRadius: 9, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, background: "#fff" }}
      >
        <option value="keep">Keep {request.primary_period.subject.name} (the original subject)</option>
        {mySubjectsForClass.map((s) => (
          <option key={s.subject_id} value={s.subject_id}>
            {s.subject_name} ({s.subject_code})
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <Button variant="primarySmall" onClick={confirm} loading={respond.isPending}>
          Confirm accept
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={respond.isPending}>
          Back
        </Button>
      </div>
    </div>
  );
}

/**
 * Sent + Received sections — a request's real coupling is per-date only
 * (never touches the recurring timetable HoD owns), so this panel is purely
 * about the decision workflow, not schedule editing.
 */
export function TimetableRequestsPanel() {
  const requests = useTimetableRequests();
  const respond = useRespondToTimetableRequest();
  const cancel = useCancelTimetableRequest();
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const sent = requests.data?.sent ?? [];
  const received = requests.data?.received ?? [];

  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Received</div>
        <div style={{ fontSize: 12.5, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>Take-over/swap requests other faculty have sent you</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {received.map((r) => (
            <div key={r.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{requestSummary(r, "received")}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginTop: 4 }}>
                    {dateLabel(r.request_date)} · {r.class.section} ({r.class.department_code})
                  </div>
                </div>
                <div style={pill(r.status)}>{r.status.toUpperCase()}</div>
              </div>

              {r.status === "pending" && acceptingId !== r.id && (
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <Button
                    variant="primarySmall"
                    onClick={() => (r.request_type === "takeover" ? setAcceptingId(r.id) : respond.mutate({ id: r.id, decision: "accepted" }))}
                    disabled={respond.isPending}
                    loading={respond.isPending && respond.variables?.id === r.id && respond.variables?.decision === "accepted"}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => respond.mutate({ id: r.id, decision: "rejected" })}
                    disabled={respond.isPending}
                    loading={respond.isPending && respond.variables?.id === r.id && respond.variables?.decision === "rejected"}
                  >
                    Decline
                  </Button>
                </div>
              )}

              {r.status === "pending" && r.request_type === "takeover" && acceptingId === r.id && (
                <AcceptTakeoverInline request={r} onDone={() => setAcceptingId(null)} />
              )}
            </div>
          ))}
          {received.length === 0 && !requests.isLoading && (
            <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 40, textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 13.5 }}>
              Nothing here yet.
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Sent by you</div>
        <div style={{ fontSize: 12.5, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>Requests you&rsquo;ve sent to other faculty</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {sent.map((r) => (
            <div key={r.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{requestSummary(r, "sent")}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginTop: 4 }}>
                    {dateLabel(r.request_date)} · {r.class.section} ({r.class.department_code})
                  </div>
                </div>
                <div style={pill(r.status)}>{r.status.toUpperCase()}</div>
              </div>
              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <Button variant="secondary" onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending} loading={cancel.isPending && cancel.variables === r.id}>
                    Withdraw
                  </Button>
                </div>
              )}
            </div>
          ))}
          {sent.length === 0 && !requests.isLoading && (
            <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 40, textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 13.5 }}>
              You haven&rsquo;t sent any requests yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
