"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Input, ProgressBar, EmptyState, type BadgeTone } from "@/components/ui";
import { useCamps, useRegisterBatch } from "@/modules/medical-centre/api/camps";

const STATE_TONE: Record<string, BadgeTone> = { Running: "accentDark", Scheduled: "accent", Planning: "neutral" };

export default function CampsPage() {
  const camps = useCamps();
  const registerBatch = useRegisterBatch();
  const [query, setQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const upcoming = camps.data?.upcoming ?? [];
  const past = camps.data?.past ?? [];

  const filteredCamps = useMemo(() => upcoming.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())), [upcoming, query]);
  const filteredPast = useMemo(() => past.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())), [past, query]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Camps & annual checkups</h1>
        <p className="mt-1 text-[13px] text-muted">First-year checkups, hostel screening and blood donation drives.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input className="min-w-[240px] max-w-[360px]" placeholder="Search camps" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex gap-1 rounded-[10px] bg-surface-tint p-1">
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className={`rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold ${!showHistory ? "bg-surface text-primary shadow-tab" : "text-muted"}`}
          >
            Current & upcoming
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className={`rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold ${showHistory ? "bg-surface text-primary shadow-tab" : "text-muted"}`}
          >
            History
          </button>
        </div>
      </div>

      {camps.isLoading ? (
        <EmptyState message="Loading…" />
      ) : !showHistory ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredCamps.length === 0 && <EmptyState message="No camps recorded yet." />}
          {filteredCamps.map((camp) => (
            <div key={camp.id} className="flex flex-col gap-3 rounded-card border border-border-default bg-surface p-[18px_20px] transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[16px] font-extrabold text-ink">{camp.title}</div>
                  <div className="text-[12.5px] text-muted">{camp.detail}</div>
                </div>
                <Badge tone={STATE_TONE[camp.state] ?? "neutral"}>{camp.state}</Badge>
              </div>
              <div className="font-mono text-[12.5px] text-subtle">{camp.date}</div>
              <div>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-muted">Registered</span>
                  <span className="font-mono text-ink">
                    {camp.done} / {camp.target}
                  </span>
                </div>
                <ProgressBar percent={camp.target > 0 ? Math.round((camp.done / camp.target) * 100) : 0} height={6} />
              </div>
              <Button variant="primarySmall" onClick={() => registerBatch.mutate(camp.id)} disabled={camp.done >= camp.target || registerBatch.isPending}>
                Register a batch
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredPast.length === 0 && <EmptyState message="No past camps recorded yet." />}
          {filteredPast.map((camp) => (
            <div key={camp.id} className="flex flex-col gap-2.5 rounded-card border border-border-default bg-surface p-[18px_20px]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[16px] font-extrabold text-ink">{camp.title}</div>
                  <div className="text-[12.5px] text-muted">{camp.detail}</div>
                </div>
                <span className="font-mono text-[12.5px] text-subtle">{camp.date}</span>
              </div>
              <div className="text-[13.5px] font-bold text-primary">{camp.outcome}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
