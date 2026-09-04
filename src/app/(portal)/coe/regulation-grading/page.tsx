"use client";

import { useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Input, Button, Badge, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
  useRegulations,
  useRegulationStats,
  useCreateRegulation,
  useUpdateRegulation,
  useCloneRegulation,
  useSubmitRegulation,
  type Regulation,
  type RegulationStatus,
  type RegulationLevel,
} from "@/modules/coe/api/regulations";
import { downloadCsv } from "@/lib/utils/csv";

const STATUS_TABS: { key: "all" | RegulationStatus; label: string }[] = [
  { key: "all", label: "All regulations" },
  { key: "active", label: "Active" },
  { key: "phasing_out", label: "Phasing out" },
  { key: "draft", label: "Draft" },
];

const STATUS_TONE: Record<RegulationStatus, BadgeTone> = {
  active: "accentDark",
  phasing_out: "neutral",
  draft: "accent",
};

const STATUS_LABEL: Record<RegulationStatus, string> = {
  active: "Active",
  phasing_out: "Phasing out",
  draft: "Draft",
};

function intakeLabel(r: Regulation): string {
  return r.intake_end_year ? `${r.intake_start_year}-${r.intake_end_year} intake` : `${r.intake_start_year} intake onward`;
}

function passCriteriaLabel(r: Regulation): string {
  if (r.pass_aggregate_pct == null || r.pass_external_pct == null) return "Under academic council review";
  return `${Number(r.pass_aggregate_pct)}% aggregate · ${Number(r.pass_external_pct)}% in external`;
}

function effectiveYearLabel(startYear: number): string {
  return `Effective AY ${startYear}-${String(startYear + 1).slice(2)}`;
}

export default function CoeRegulationGradingPage() {
  const [status, setStatus] = useState<"all" | RegulationStatus>("all");
  const [level, setLevel] = useState<RegulationLevel | null>(null);
  const [scale, setScale] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<Regulation | "new" | null>(null);
  const [cloneTarget, setCloneTarget] = useState<Regulation | null>(null);

  const stats = useRegulationStats();
  const regulations = useRegulations({ status: status === "all" ? null : status, level, scale, search });

  const rows = regulations.data ?? [];

  function handleExport() {
    downloadCsv(
      "regulations",
      [
        { header: "Code", value: (r: Regulation) => r.code },
        { header: "Applies to", value: (r: Regulation) => r.applies_to_description },
        { header: "Intake years", value: (r: Regulation) => `${r.intake_start_year}${r.intake_end_year ? `-${r.intake_end_year}` : "+"}` },
        { header: "Grading scale", value: (r: Regulation) => r.grading_scale },
        { header: "Pass aggregate %", value: (r: Regulation) => r.pass_aggregate_pct ?? "—" },
        { header: "Pass external %", value: (r: Regulation) => r.pass_external_pct ?? "—" },
        { header: "Attendance threshold %", value: (r: Regulation) => r.attendance_threshold_pct },
        { header: "Status", value: (r: Regulation) => r.status },
      ],
      rows,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Regulation &amp; Grading"
        subtitle="Credit rules, grade bands, pass criteria, moderation limits and attendance thresholds per regulation."
        actions={
          <>
            <Button variant="secondary" className="w-auto" disabled={rows.length === 0} onClick={handleExport}>
              Export
            </Button>
            <Button variant="primarySmall" className="w-auto" onClick={() => setEditTarget("new")}>
              + New regulation
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Active regulations"
          value={stats.data?.active_count ?? 0}
          icon="verified"
          sub={rows.find((r) => r.status === "active") ? `${rows.find((r) => r.status === "active")!.code} current intake` : undefined}
          loading={stats.isLoading}
        />
        <StatCard label="Programmes mapped" value={stats.data?.programmes_mapped ?? 0} icon="school" sub="courses linked to a regulation" loading={stats.isLoading} />
        <StatCard
          label="Grade bands"
          value={stats.data?.grade_bands_count ?? 0}
          icon="workspace_premium"
          sub="O to U, 10-point scale"
          loading={stats.isLoading}
        />
        <StatCard
          label="Moderation ceiling"
          value={stats.data?.moderation_ceiling_marks != null ? `±${stats.data.moderation_ceiling_marks} marks` : "—"}
          icon="tune"
          sub={stats.data?.moderation_ceiling_candidate_pct != null ? `${Number(stats.data.moderation_ceiling_candidate_pct)}% of candidates per course` : undefined}
          loading={stats.isLoading}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs options={STATUS_TABS} value={status} onChange={(k) => setStatus(k as typeof status)} />
          <div className="flex items-center gap-3">
            <Select value={level ?? ""} onChange={(e) => setLevel((e.target.value || null) as RegulationLevel | null)} className="w-32">
              <option value="">All levels</option>
              <option value="UG">UG</option>
              <option value="PG">PG</option>
            </Select>
            <Select value={scale ?? ""} onChange={(e) => setScale(e.target.value || null)} className="w-36">
              <option value="">All scales</option>
              <option value="10-point">10-point</option>
            </Select>
            <SearchBar placeholder="Search regulation, programme…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[260px]" />
          </div>
        </div>
      </Card>

      {regulations.isLoading ? (
        <SkeletonTable rows={5} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Regulations</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No regulations match the current filters.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[180px] shrink-0">Regulation</div>
                <div className="flex-1">Applies to</div>
                <div className="w-[220px]">Pass criteria</div>
                <div className="w-[90px]">Attendance</div>
                <div className="w-[70px]">Moderation</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[170px] text-right">Actions</div>
              </div>
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="w-[180px] shrink-0">
                    <div className="text-[13.5px] font-extrabold text-ink">{r.code}</div>
                    <div className="text-[11.5px] text-muted">{effectiveYearLabel(r.intake_start_year)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] text-ink">{r.applies_to_description}</div>
                    <div className="text-[11.5px] text-muted">{intakeLabel(r)}</div>
                  </div>
                  <div className="w-[220px] text-[12.5px] text-ink">{passCriteriaLabel(r)}</div>
                  <div className="w-[90px] text-[12.5px] text-ink">{Number(r.attendance_threshold_pct)}%</div>
                  <div className="w-[70px] text-[12.5px] text-ink">±{r.moderation_ceiling_marks}</div>
                  <div className="w-[110px]">
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status].toUpperCase()}</Badge>
                  </div>
                  <div className="flex w-[170px] shrink-0 justify-end gap-2">
                    <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => setEditTarget(r)}>
                      Open
                    </Button>
                    {r.status === "draft" ? (
                      <SubmitButton regulation={r} />
                    ) : (
                      <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => setCloneTarget(r)}>
                        Clone
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <RegulationModal target={editTarget} onClose={() => setEditTarget(null)} />
      <CloneModal regulation={cloneTarget} onClose={() => setCloneTarget(null)} />
    </div>
  );
}

function SubmitButton({ regulation }: { regulation: Regulation }) {
  const submit = useSubmitRegulation();
  const canSubmit = regulation.pass_aggregate_pct != null && regulation.pass_external_pct != null;
  return (
    <Button
      variant="primarySmall"
      className="w-auto px-3 py-1.5 text-[12px]"
      disabled={!canSubmit || submit.isPending}
      title={canSubmit ? undefined : "Set pass aggregate and external percentages first"}
      onClick={() => submit.mutate(regulation.id)}
    >
      {submit.isPending ? "Submitting…" : "Submit"}
    </Button>
  );
}

function RegulationModal({ target, onClose }: { target: Regulation | "new" | null; onClose: () => void }) {
  const isNew = target === "new";
  const existing = target && target !== "new" ? target : null;
  const open = target !== null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "New regulation" : `Edit ${existing?.code}`}
      subtitle="Credit rules, pass criteria, attendance threshold and moderation ceiling."
      className="max-w-[640px]"
    >
      {/* Keyed by the record being edited so switching targets remounts this
          with fresh initial state, instead of an effect resyncing state and
          triggering a cascading render on every open. */}
      {target && <RegulationModalBody key={target === "new" ? "new" : target.id} target={target} onClose={onClose} />}
    </Modal>
  );
}

function RegulationModalBody({ target, onClose }: { target: Regulation | "new"; onClose: () => void }) {
  const existing = target !== "new" ? target : null;
  const create = useCreateRegulation();
  const update = useUpdateRegulation();

  const [code, setCode] = useState(existing?.code ?? "");
  const [level, setLevel] = useState<RegulationLevel>(existing?.applies_to_level ?? "UG");
  const [description, setDescription] = useState(existing?.applies_to_description ?? "");
  const [startYear, setStartYear] = useState(existing ? String(existing.intake_start_year) : "");
  const [endYear, setEndYear] = useState(existing?.intake_end_year != null ? String(existing.intake_end_year) : "");
  const [passAggregate, setPassAggregate] = useState(existing?.pass_aggregate_pct != null ? String(Number(existing.pass_aggregate_pct)) : "");
  const [passExternal, setPassExternal] = useState(existing?.pass_external_pct != null ? String(Number(existing.pass_external_pct)) : "");
  const [attendance, setAttendance] = useState(existing ? String(Number(existing.attendance_threshold_pct)) : "75");
  const [moderationMarks, setModerationMarks] = useState(existing ? String(existing.moderation_ceiling_marks) : "3");
  const [moderationPct, setModerationPct] = useState(existing ? String(Number(existing.moderation_ceiling_candidate_pct)) : "5");

  function handleClose() {
    create.reset();
    update.reset();
    onClose();
  }

  function handleSave() {
    const payload = {
      code,
      applies_to_level: level,
      applies_to_description: description,
      intake_start_year: Number(startYear),
      intake_end_year: endYear ? Number(endYear) : undefined,
      pass_aggregate_pct: passAggregate ? Number(passAggregate) : undefined,
      pass_external_pct: passExternal ? Number(passExternal) : undefined,
      attendance_threshold_pct: Number(attendance),
      moderation_ceiling_marks: Number(moderationMarks),
      moderation_ceiling_candidate_pct: Number(moderationPct),
    };
    if (existing) {
      update.mutate({ id: existing.id, ...payload }, { onSuccess: handleClose });
    } else {
      create.mutate(payload, { onSuccess: handleClose });
    }
  }

  const mutation = existing ? update : create;
  const canSave = code.trim() !== "" && description.trim() !== "" && startYear !== "";

  return (
    <>
      <RegulationForm
        code={code}
        setCode={setCode}
        level={level}
        setLevel={setLevel}
        description={description}
        setDescription={setDescription}
        startYear={startYear}
        setStartYear={setStartYear}
        endYear={endYear}
        setEndYear={setEndYear}
        passAggregate={passAggregate}
        setPassAggregate={setPassAggregate}
        passExternal={passExternal}
        setPassExternal={setPassExternal}
        attendance={attendance}
        setAttendance={setAttendance}
        moderationMarks={moderationMarks}
        setModerationMarks={setModerationMarks}
        moderationPct={moderationPct}
        setModerationPct={setModerationPct}
      />
      {mutation.isError && <p className="mt-2 text-[12px] text-danger-fg">{(mutation.error as Error).message}</p>}
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" className="w-auto" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primarySmall" disabled={!canSave || mutation.isPending} onClick={handleSave}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
}

interface RegulationFormProps {
  code: string;
  setCode: (v: string) => void;
  level: RegulationLevel;
  setLevel: (v: RegulationLevel) => void;
  description: string;
  setDescription: (v: string) => void;
  startYear: string;
  setStartYear: (v: string) => void;
  endYear: string;
  setEndYear: (v: string) => void;
  passAggregate: string;
  setPassAggregate: (v: string) => void;
  passExternal: string;
  setPassExternal: (v: string) => void;
  attendance: string;
  setAttendance: (v: string) => void;
  moderationMarks: string;
  setModerationMarks: (v: string) => void;
  moderationPct: string;
  setModerationPct: (v: string) => void;
}

function RegulationForm(props: RegulationFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Code</label>
          <Input value={props.code} onChange={(e) => props.setCode(e.target.value)} placeholder="e.g. R-2027" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Level</label>
          <Select value={props.level} onChange={(e) => props.setLevel(e.target.value as RegulationLevel)}>
            <option value="UG">UG</option>
            <option value="PG">PG</option>
          </Select>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Applies to</label>
        <Input value={props.description} onChange={(e) => props.setDescription(e.target.value)} placeholder="e.g. B.E./B.Tech. all branches" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Intake start year</label>
          <Input type="number" value={props.startYear} onChange={(e) => props.setStartYear(e.target.value)} placeholder="2027" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Intake end year (optional)</label>
          <Input type="number" value={props.endYear} onChange={(e) => props.setEndYear(e.target.value)} placeholder="Leave blank if ongoing" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Pass aggregate %</label>
          <Input type="number" value={props.passAggregate} onChange={(e) => props.setPassAggregate(e.target.value)} placeholder="50" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Pass external %</label>
          <Input type="number" value={props.passExternal} onChange={(e) => props.setPassExternal(e.target.value)} placeholder="45" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Attendance %</label>
          <Input type="number" value={props.attendance} onChange={(e) => props.setAttendance(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Moderation ceiling (marks)</label>
          <Input type="number" value={props.moderationMarks} onChange={(e) => props.setModerationMarks(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Moderation ceiling (% candidates)</label>
          <Input type="number" value={props.moderationPct} onChange={(e) => props.setModerationPct(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function CloneModal({ regulation, onClose }: { regulation: Regulation | null; onClose: () => void }) {
  const clone = useCloneRegulation();
  const [newCode, setNewCode] = useState("");

  function handleClose() {
    setNewCode("");
    clone.reset();
    onClose();
  }

  function handleClone() {
    if (!regulation || !newCode.trim()) return;
    clone.mutate({ id: regulation.id, new_code: newCode.trim() }, { onSuccess: handleClose });
  }

  return (
    <Modal open={regulation != null} onClose={handleClose} title="Clone regulation" subtitle={regulation ? `Copies every rule from ${regulation.code} into a new draft.` : undefined}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">New code</label>
          <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. R-2023-REV" />
        </div>
        {clone.isError && <p className="text-[12px] text-danger-fg">{(clone.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!newCode.trim() || clone.isPending} onClick={handleClone}>
            {clone.isPending ? "Cloning…" : "Clone"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
