"use client";

import { use, useMemo, useRef, useState } from "react";
import { Card, Button, Input, Badge } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { usePassRules } from "@/modules/coe/api/settings";
import { useMarkSheet, useEnterScriptMark, useSubmitBundle, type MarkSheetRow } from "@/modules/coe/api/scriptBundles";

// Matches the institution's standard end-semester script pattern shown in
// the design spec: Part A is short-answer questions 1-8 (40 marks total),
// Part B is questions 9-11 (36 marks), Part C is the single long question 12
// (24 marks) — 100 marks raw, same 3-part split already stored as
// part_a/b/c_marks. Real max-marks constants, not fabricated per script.
const PART_A_LABEL = "Q1–8 (40)";
const PART_B_LABEL = "Q9–11 (36)";
const PART_C_LABEL = "Q12 (24)";
const PART_A_MAX = 40;
const PART_B_MAX = 36;
const PART_C_MAX = 24;

function inputKey(dummyNumber: number, col: "a" | "b" | "c") {
  return `${dummyNumber}-${col}`;
}

export default function CoeMarkEntrySheetPage({ params }: { params: Promise<{ bundleId: string }> }) {
  const { bundleId: bundleIdParam } = use(params);
  const bundleId = Number(bundleIdParam);
  const sheet = useMarkSheet(bundleId);
  const passRules = usePassRules();
  const enterMark = useEnterScriptMark();
  const submit = useSubmitBundle();
  const [jump, setJump] = useState("");
  const inputRefs = useRef(new Map<string, HTMLInputElement>());

  const rows = sheet.data?.rows ?? [];
  const locked = sheet.data?.bundle.status === "submitted";
  const passMark = passRules.data?.pass_mark_total ?? 50;

  const summary = useMemo(() => {
    const entered = rows.filter((r) => r.total_marks != null || r.is_absent);
    const absent = rows.filter((r) => r.is_absent);
    const scored = rows.filter((r) => r.total_marks != null && !r.is_absent);
    const belowPass = scored.filter((r) => Number(r.total_marks) < passMark);
    const average = scored.length > 0 ? scored.reduce((sum, r) => sum + Number(r.total_marks), 0) / scored.length : 0;
    const maximaViolated = rows.filter(
      (r) => (r.part_a_marks != null && r.part_a_marks > PART_A_MAX) || (r.part_b_marks != null && r.part_b_marks > PART_B_MAX) || (r.part_c_marks != null && r.part_c_marks > PART_C_MAX),
    );
    return {
      total: rows.length,
      entered: entered.length,
      blank: rows.length - entered.length,
      absent: absent.length,
      average: Math.round(average * 10) / 10,
      belowPass: belowPass.length,
      maximaViolated: maximaViolated.length,
    };
  }, [rows, passMark]);

  function focusCell(dummyNumber: number, col: "a" | "b" | "c") {
    const el = inputRefs.current.get(inputKey(dummyNumber, col));
    if (el) {
      el.focus();
      el.scrollIntoView({ block: "center" });
    }
  }

  function handleJump() {
    const target = Number(jump.trim());
    if (!target) return;
    focusCell(target, "a");
  }

  const canSubmit = !locked && summary.blank === 0 && summary.maximaViolated === 0;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Mark Entry Sheet"
        subtitle={sheet.data ? `Bundle ${sheet.data.bundle.bundle_code} · ${sheet.data.bundle.subject.subject_code} · ${sheet.data.bundle.subject.name}` : "Loading…"}
        backHref="/coe/exam-valuation"
        actions={
          <Button variant="primarySmall" className="w-auto" disabled={!canSubmit || submit.isPending} onClick={() => submit.mutate(bundleId)}>
            {submit.isPending ? "Submitting…" : locked ? "Submitted" : "Submit & lock sheet"}
          </Button>
        }
      />

      {sheet.isLoading ? (
        <SkeletonTable rows={8} />
      ) : (
        <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                  value={jump}
                  onChange={(e) => setJump(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJump()}
                  placeholder="Jump to dummy number…"
                  className="max-w-[240px]"
                />
                <span className="text-[11.5px] text-subtle">Enter moves down · Tab moves right · blank leaves the row unentered</span>
              </div>
            </Card>

            <Card className="p-0">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-divider text-left text-[11px] uppercase tracking-[.05em] text-subtle">
                    <th className="px-4 py-3">Dummy no.</th>
                    <th className="px-4 py-3">{PART_A_LABEL}</th>
                    <th className="px-4 py-3">{PART_B_LABEL}</th>
                    <th className="px-4 py-3">{PART_C_LABEL}</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <MarkRow
                      key={r.dummy_number}
                      row={r}
                      nextDummyNumber={rows[idx + 1]?.dummy_number ?? null}
                      passMark={passMark}
                      locked={locked}
                      registerRef={(col, el) => {
                        if (el) inputRefs.current.set(inputKey(r.dummy_number, col), el);
                        else inputRefs.current.delete(inputKey(r.dummy_number, col));
                      }}
                      focusCell={focusCell}
                      onSave={(body) => enterMark.mutate({ bundleId, ...body })}
                    />
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-[13.5px] font-extrabold text-ink">Sheet summary</div>
              <div className="mt-3 flex flex-col gap-2 text-[12.5px]">
                <SummaryRow label="Scripts in bundle" value={summary.total} />
                <SummaryRow label="Entered" value={`${summary.entered} / ${summary.total}`} />
                <SummaryRow label="Absent" value={summary.absent} />
                <SummaryRow label="Average mark" value={summary.average} />
                <SummaryRow label={`Below pass (${passMark})`} value={summary.belowPass} danger={summary.belowPass > 0} />
              </div>
            </Card>

            <Card>
              <div className="text-[13.5px] font-extrabold text-ink">Checks before submit</div>
              <p className="mt-1 text-[11.5px] text-subtle">Submission is blocked until every check clears.</p>
              <div className="mt-3 flex flex-col gap-3 text-[12.5px]">
                <CheckRow ok={summary.blank === 0} title="Every script entered" detail={summary.blank === 0 ? "All scripts entered" : `${summary.blank} scripts still blank`} />
                <CheckRow ok={summary.maximaViolated === 0} title="Question maxima respected" detail={summary.maximaViolated === 0 ? "No part exceeds its maximum" : `${summary.maximaViolated} scripts exceed a part maximum`} />
                <CheckRow ok={!!sheet.data?.bundle.valuator} title="Valuator identity verified" detail={sheet.data?.bundle.valuator ? `${sheet.data.bundle.valuator.first_name} ${sheet.data.bundle.valuator.last_name}` : "Not yet allocated"} />
                <CheckRow ok={null} title="Chief examiner scrutiny" detail="Runs after submission, on a 10% sample" />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-divider py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className={`font-bold ${danger ? "text-danger-fg" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function CheckRow({ ok, title, detail }: { ok: boolean | null; title: string; detail: string }) {
  const dot = ok === null ? "bg-primary" : ok ? "bg-primary-dark" : "bg-danger-fg";
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-1 size-2 shrink-0 rounded-full ${dot}`} />
      <div>
        <div className="font-bold text-ink">{title}</div>
        <div className="text-[11.5px] text-subtle">{detail}</div>
      </div>
    </div>
  );
}

function MarkRow({
  row,
  nextDummyNumber,
  passMark,
  locked,
  registerRef,
  focusCell,
  onSave,
}: {
  row: MarkSheetRow;
  nextDummyNumber: number | null;
  passMark: number;
  locked: boolean;
  registerRef: (col: "a" | "b" | "c", el: HTMLInputElement | null) => void;
  focusCell: (dummyNumber: number, col: "a" | "b" | "c") => void;
  onSave: (body: { dummy_number: number; part_a_marks?: number; part_b_marks?: number; part_c_marks?: number; is_absent?: boolean }) => void;
}) {
  const [a, setA] = useState(row.is_absent ? "AB" : row.part_a_marks != null ? String(row.part_a_marks) : "");
  const [b, setB] = useState(row.is_absent ? "AB" : row.part_b_marks != null ? String(row.part_b_marks) : "");
  const [c, setC] = useState(row.is_absent ? "AB" : row.part_c_marks != null ? String(row.part_c_marks) : "");

  const isAbsentValue = (v: string) => v.trim().toUpperCase() === "AB";

  function commit(nextA: string, nextB: string, nextC: string) {
    if (isAbsentValue(nextA) || isAbsentValue(nextB) || isAbsentValue(nextC)) {
      setA("AB");
      setB("AB");
      setC("AB");
      onSave({ dummy_number: row.dummy_number, is_absent: true });
      return;
    }
    onSave({
      dummy_number: row.dummy_number,
      part_a_marks: nextA ? Number(nextA) : undefined,
      part_b_marks: nextB ? Number(nextB) : undefined,
      part_c_marks: nextC ? Number(nextC) : undefined,
      is_absent: false,
    });
  }

  function handleEnter(col: "a" | "b" | "c") {
    if (nextDummyNumber != null) focusCell(nextDummyNumber, col);
  }

  const belowPass = row.total_marks != null && !row.is_absent && Number(row.total_marks) < passMark;
  const flag = row.is_absent ? "Absent" : belowPass ? "Below pass" : null;

  return (
    <tr className={`border-b border-divider last:border-0 ${belowPass ? "bg-danger-bg" : ""}`}>
      <td className="px-4 py-2 font-bold text-ink">{row.dummy_number}</td>
      {(["a", "b", "c"] as const).map((col) => {
        const [value, setValue] = col === "a" ? [a, setA] : col === "b" ? [b, setB] : [c, setC];
        return (
          <td key={col} className="px-4 py-2">
            <Input
              ref={(el) => registerRef(col, el)}
              className="w-20"
              disabled={locked}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => commit(a, b, c)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commit(a, b, c);
                  handleEnter(col);
                }
              }}
            />
          </td>
        );
      })}
      <td className="px-4 py-2 font-bold text-ink">{row.is_absent ? "AB" : row.total_marks ?? "—"}</td>
      <td className="px-4 py-2">{flag && <Badge tone={row.is_absent ? "neutral" : "danger"}>{flag.toUpperCase()}</Badge>}</td>
    </tr>
  );
}
