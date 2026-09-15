"use client";

import { useState } from "react";
import { Card, Input, Button } from "@/components/ui";
import { Toggle } from "@/components/ui/Toggle";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { usePassRules, useUpdatePassRules, type PassRules } from "@/modules/coe/api/settings";
import { ROLE_LABEL } from "@/lib/config";

type FieldKey = keyof Pick<PassRules, "internal_max_marks" | "external_max_marks" | "pass_mark_total" | "min_external_marks">;

// Mirrors GRADE_BANDS in marks-roster.service.ts's gradeFor() exactly — no
// grade_bands table exists yet (see the optional CREATE TABLE in query.md),
// so these thresholds live as a matching constant on both sides instead of
// being fetched, and stay read-only here rather than faking a save.
const GRADE_SCALE_STATIC = [
  { grade: "O", min: 91, label: "91 and above" },
  { grade: "A+", min: 81, label: "81 and above" },
  { grade: "A", min: 71, label: "71 and above" },
  { grade: "B+", min: 61, label: "61 and above" },
  { grade: "B", min: 50, label: "50 and above" },
  { grade: "U", min: null, label: "Below 50" },
];

// Real, backend-enforced access, not a stored/editable permission matrix (no
// role_permissions table exists yet — see query.md): every coe-role user
// hits the same @Roles(ROLES.COE) guard on timetable/marks/settings routes
// (confirmed against each controller), and the ONLY senior-only check
// anywhere in the exams backend is is_senior on seating-plans' publishVersion.
const ACCESS_MATRIX: { role: string; timetable: boolean; marks: boolean; publish: boolean; settings: boolean }[] = [
  { role: ROLE_LABEL.coe, timetable: true, marks: true, publish: false, settings: true },
  { role: "Senior COE", timetable: true, marks: true, publish: true, settings: true },
];

export default function CoeSettingsPage() {
  const passRules = usePassRules();
  const updatePassRules = useUpdatePassRules();

  // Edits are tracked as overrides layered on top of the fetched row rather
  // than copied into local state via an effect (which would double-render
  // on every fetch) — each field falls back to the live server value until
  // the user actually touches it.
  const [overrides, setOverrides] = useState<Partial<Record<FieldKey, string>>>({});

  function fieldValue(key: FieldKey): string {
    if (overrides[key] !== undefined) return overrides[key]!;
    return passRules.data ? String(passRules.data[key]) : "";
  }

  function setField(key: FieldKey, value: string) {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!passRules.data) return;
    updatePassRules.mutate(
      {
        internal_max_marks: Number(fieldValue("internal_max_marks")),
        external_max_marks: Number(fieldValue("external_max_marks")),
        pass_mark_total: Number(fieldValue("pass_mark_total")),
        min_external_marks: Number(fieldValue("min_external_marks")),
      },
      { onSuccess: () => setOverrides({}) },
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Settings" subtitle="Pass marks, grade scale, roles and access" />

      {passRules.isLoading ? (
        <SkeletonBlock />
      ) : passRules.isError ? (
        <Card className="border-danger-border bg-danger-bg">
          <p className="text-[13px] text-danger-fg">{(passRules.error as Error).message}</p>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Marks and pass rules</h2>
            <Button variant="primarySmall" onClick={handleSave} disabled={updatePassRules.isPending}>
              {updatePassRules.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Internal maximum</label>
              <Input type="number" value={fieldValue("internal_max_marks")} onChange={(e) => setField("internal_max_marks", e.target.value)} />
              <p className="mt-1.5 text-[12px] text-subtle">Marks carried from continuous assessment</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">External maximum</label>
              <Input type="number" value={fieldValue("external_max_marks")} onChange={(e) => setField("external_max_marks", e.target.value)} />
              <p className="mt-1.5 text-[12px] text-subtle">Entered in the marks desk</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Pass mark (total)</label>
              <Input type="number" value={fieldValue("pass_mark_total")} onChange={(e) => setField("pass_mark_total", e.target.value)} />
              <p className="mt-1.5 text-[12px] text-subtle">Below this the candidate is graded U</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Minimum external</label>
              <Input type="number" value={fieldValue("min_external_marks")} onChange={(e) => setField("min_external_marks", e.target.value)} />
              <p className="mt-1.5 text-[12px] text-subtle">Required in the written paper alone</p>
            </div>
          </div>
          {updatePassRules.isError && <p className="mt-2 text-[12px] text-danger-fg">{(updatePassRules.error as Error).message}</p>}
        </Card>
      )}

      <div className="grid grid-cols-[1.1fr_1fr] gap-4 items-start">
        <Card>
          <h2 className="text-[17px] font-extrabold text-ink">Grade scale</h2>
          <p className="mt-1 text-[12px] text-subtle">No grade_bands table exists yet — reference values, not editable here.</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {GRADE_SCALE_STATIC.map((g) => (
              <div key={g.grade} className="flex items-center gap-3">
                <span
                  className={
                    g.grade === "U"
                      ? "flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-danger-bg text-[12.5px] font-extrabold text-danger-fg"
                      : "flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-accent-50 text-[12.5px] font-extrabold text-primary"
                  }
                >
                  {g.grade}
                </span>
                <span className="flex-1 text-[13.5px] text-ink">{g.label}</span>
                {g.min == null ? (
                  <span className="text-[12.5px] font-bold text-danger-fg">Fail</span>
                ) : (
                  <Input value={String(g.min)} disabled className="w-20 text-center" />
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-[17px] font-extrabold text-ink">Roles and access</h2>
          <p className="mt-1 text-[12px] text-subtle">
            Real access per tier, read directly from the backend&apos;s route guards — not a stored/editable matrix.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-[1fr_repeat(4,44px)] items-center gap-2">
              <span />
              {["Timetable", "Marks", "Publish", "Settings"].map((c) => (
                <span key={c} className="text-center text-[10px] font-extrabold uppercase tracking-[.05em] text-subtle">
                  {c}
                </span>
              ))}
            </div>
            {ACCESS_MATRIX.map((row) => (
              <div key={row.role} className="grid grid-cols-[1fr_repeat(4,44px)] items-center gap-2">
                <span className="text-[13.5px] font-bold text-ink">{row.role}</span>
                <span className="flex justify-center">
                  <Toggle checked={row.timetable} disabled />
                </span>
                <span className="flex justify-center">
                  <Toggle checked={row.marks} disabled />
                </span>
                <span className="flex justify-center">
                  <Toggle checked={row.publish} disabled />
                </span>
                <span className="flex justify-center">
                  <Toggle checked={row.settings} disabled />
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
