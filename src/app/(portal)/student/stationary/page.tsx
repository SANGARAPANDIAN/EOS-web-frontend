"use client";

import { useState } from "react";
import { Card, EmptyState, Icon, Select, SegmentedTabs } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  usePayStationaryRequest,
  useMyStationaryRequests,
  estimateStationaryCost,
  type CreateStationaryOrderInput,
  type StationaryOrientation,
  type StationaryColorMode,
  type StationaryPaperSize,
  type StationarySides,
  type StationaryBinding,
  type StationaryRequestStatus,
  type MyStationaryRequest,
} from "@/modules/student/api/stationary";
import { ApiError } from "@/types/api";

type Tab = "request" | "history";

const PAPER_SIZES: StationaryPaperSize[] = ["A4", "A3", "A5", "Letter", "Legal"];
const SIDES_OPTIONS: StationarySides[] = ["Single-sided", "Double-sided"];
const ORIENTATIONS: StationaryOrientation[] = ["portrait", "landscape"];
const BINDINGS: StationaryBinding[] = ["No binding", "Spiral binding", "Calico binding"];

const STATUS_LABEL: Record<StationaryRequestStatus, string> = {
  pending_payment: "Payment pending",
  paid: "Paid",
  processing: "Processing",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  rejected: "Rejected",
};

const STATUS_STYLE: Record<StationaryRequestStatus, { text: string; bg: string }> = {
  pending_payment: { text: "text-amber-700", bg: "bg-amber-50" },
  paid: { text: "text-emerald-700", bg: "bg-emerald-50" },
  processing: { text: "text-primary", bg: "bg-accent-50" },
  ready_for_pickup: { text: "text-primary", bg: "bg-accent-50" },
  completed: { text: "text-emerald-700", bg: "bg-emerald-50" },
  rejected: { text: "text-danger-fg", bg: "bg-danger-bg" },
};

function requestSummaryLine(request: MyStationaryRequest): string {
  const copyLabel = `${request.copies} ${request.copies === 1 ? "copy" : "copies"}`;
  const colorShort = request.color_mode === "color" ? "Color" : "B&W";
  return `${request.total_pages} pages · ${copyLabel} · ${colorShort}${request.paper_size ? ` · ${request.paper_size}` : ""}`;
}

export default function StationaryPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("request");
  const pay = usePayStationaryRequest();
  const history = useMyStationaryRequests();

  const [fileSummary, setFileSummary] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [copies, setCopies] = useState(1);
  const [orientation, setOrientation] = useState<StationaryOrientation>("portrait");
  const [colorMode, setColorMode] = useState<StationaryColorMode>("bw");
  const [paperSize, setPaperSize] = useState<StationaryPaperSize>("A4");
  const [sides, setSides] = useState<StationarySides>("Single-sided");
  const [binding, setBinding] = useState<StationaryBinding>("No binding");
  const [error, setError] = useState<string | null>(null);

  const estimatedCost = estimateStationaryCost(totalPages, copies);

  function resetForm() {
    setFileSummary("");
    setTotalPages(1);
    setCopies(1);
    setOrientation("portrait");
    setColorMode("bw");
    setPaperSize("A4");
    setSides("Single-sided");
    setBinding("No binding");
  }

  function handleSubmit() {
    setError(null);
    if (totalPages < 1) return setError("Enter how many pages you're printing.");

    const input: CreateStationaryOrderInput = {
      file_summary: fileSummary.trim() || undefined,
      total_pages: totalPages,
      copies,
      orientation,
      color_mode: colorMode,
      paper_size: paperSize,
      sides,
      binding,
    };

    pay
      .mutateAsync({ input, studentEmail: session?.user.email })
      .then(() => {
        resetForm();
        setTab("history");
        history.refetch();
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === "Payment cancelled") return;
        setError(err instanceof ApiError ? err.message : "Couldn't submit your print request.");
      });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Copy Center</h1>
        <p className="mt-1 text-[13.5px] text-muted">Submit a print job, pay online, and collect at the counter.</p>
      </div>

      <SegmentedTabs
        options={[
          { key: "request", label: "Request" },
          { key: "history", label: "History" },
        ]}
        value={tab}
        onChange={(k) => setTab(k as Tab)}
      />

      {tab === "request" ? (
        <Card className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-body">File description (optional)</label>
            <input
              value={fileSummary}
              onChange={(e) => setFileSummary(e.target.value)}
              placeholder="e.g. Lab record chapters 1-4"
              className="w-full rounded-input border border-border-default bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-subtle">Bring your own file / USB to the counter — this form is only the print job details.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-body">Total pages *</label>
              <input
                type="number"
                min={1}
                value={totalPages}
                onChange={(e) => setTotalPages(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-input border border-border-default bg-surface px-3.5 py-2.5 text-[13px] text-ink focus:border-border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-body">Copies (1-50) *</label>
              <input
                type="number"
                min={1}
                max={50}
                value={copies}
                onChange={(e) => setCopies(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full rounded-input border border-border-default bg-surface px-3.5 py-2.5 text-[13px] text-ink focus:border-border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-body">Orientation</label>
              <Select value={orientation} onChange={(e) => setOrientation(e.target.value as StationaryOrientation)}>
                {ORIENTATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o === "portrait" ? "Portrait" : "Landscape"}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-body">Color</label>
              <Select value={colorMode} onChange={(e) => setColorMode(e.target.value as StationaryColorMode)}>
                <option value="bw">Black & White</option>
                <option value="color">Color</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-body">Paper size</label>
              <Select value={paperSize} onChange={(e) => setPaperSize(e.target.value as StationaryPaperSize)}>
                {PAPER_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-body">Sides</label>
              <Select value={sides} onChange={(e) => setSides(e.target.value as StationarySides)}>
                {SIDES_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-body">Binding</label>
              <Select value={binding} onChange={(e) => setBinding(e.target.value as StationaryBinding)}>
                {BINDINGS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-input bg-surface-tint px-4 py-3">
            <span className="text-[12.5px] font-semibold text-body">Estimated cost</span>
            <span className="text-lg font-bold text-ink">₹{estimatedCost}</span>
          </div>

          {error && <p className="text-[13px] text-danger-fg">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={pay.isPending}
            className="w-full rounded-xl bg-primary py-3.5 text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:bg-disabled enabled:hover:bg-primary-dark"
          >
            {pay.isPending ? "Processing…" : `Pay ₹${estimatedCost} & submit`}
          </button>
        </Card>
      ) : history.isLoading ? (
        <Card>
          <EmptyState loading />
        </Card>
      ) : history.error ? (
        <Card>
          <EmptyState message={history.error instanceof ApiError ? history.error.message : "Couldn't load your requests."} />
        </Card>
      ) : (history.data ?? []).length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Icon name="print" size={32} className="text-subtle" />
          <p className="text-sm font-semibold text-body">No print requests yet</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {(history.data ?? []).map((r) => {
            const style = STATUS_STYLE[r.status];
            return (
              <Card key={r.id} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13.5px] font-bold text-ink">{r.file_summary || `Request #${r.id}`}</p>
                  <span className={`shrink-0 rounded-[8px] px-2 py-0.5 text-[10.5px] font-bold ${style.bg} ${style.text}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="text-[12px] text-muted">{requestSummaryLine(r)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">₹{r.amount}</span>
                  {r.rejection_reason && <span className="text-[11.5px] text-danger-fg">{r.rejection_reason}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
