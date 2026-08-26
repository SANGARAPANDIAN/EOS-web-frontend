"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import { CandidateProfileModal } from "@/modules/principal/components/CandidateProfileModal";
import {
  useAppointHod,
  useRoleAllocationCandidates,
  useRoleAllocationDepartments,
  useRoleAllocationHistory,
  type RoleAllocationCandidate,
  type RoleAllocationDepartment,
} from "@/modules/principal/api/roleAllocation";

type SortKey = "experience_years" | "publications_count" | "attendance_percentage";

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "experience_years", label: "Experience", icon: "military_tech" },
  { key: "publications_count", label: "Publications", icon: "menu_book" },
  { key: "attendance_percentage", label: "Attendance", icon: "event_available" },
];

const AVATAR_COLORS = ["#1D47AE", "#0E7490", "#4F46E5", "#2563EB", "#3730A3", "#0891B2", "#1D4ED8"];

function initialsOf(name: string): string {
  return name
    .replace(/^(Dr\.|Prof\.)\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** "M.E. / M.Tech" -> ["M.E.", "M.Tech"], one per line, instead of one long line forcing the QUAL. column wide. */
function qualificationLines(qualification: string | null): string[] {
  if (!qualification) return ["—"];
  return qualification
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function Avatar({ name, index, size = 40 }: { name: string; index: number; size?: number }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
      style={{ width: size, height: size, background: color }}
    >
      {initialsOf(name)}
    </div>
  );
}

function DepartmentListItem({
  dept,
  active,
  onSelect,
}: {
  dept: RoleAllocationDepartment;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all"
      style={{
        background: active ? principalColors.surfaceTint : principalColors.bg,
        borderColor: active ? principalColors.primary : principalColors.borderMuted,
        boxShadow: active ? "0 0 0 1px " + principalColors.primary : undefined,
      }}
    >
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold"
        style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
      >
        {dept.code.slice(0, 3)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold" style={{ color: principalColors.heading }}>
          {dept.name}
        </div>
        {dept.hod ? (
          <div className="mt-0.5 truncate text-[13px]" style={{ color: principalColors.textFaint }}>
            {dept.hod.name}
            {dept.hod.since ? ` · since ${formatDate(dept.hod.since)}` : ""}
          </div>
        ) : (
          <div className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#B45309" }}>
            <Icon name="error" size={14} />
            No HoD assigned
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: principalColors.textSubtle }}>
          <Icon name="groups" size={14} />
          {dept.faculty_count} faculty · {dept.professor_count} professors
        </div>
      </div>
      <Icon name="chevron_right" size={18} style={{ color: active ? principalColors.primary : principalColors.textSubtle }} />
    </button>
  );
}

function CandidateRow({
  candidate,
  index,
  onViewProfile,
}: {
  candidate: RoleAllocationCandidate;
  index: number;
  onViewProfile: () => void;
}) {
  return (
    <tr
      className="border-t transition-colors"
      style={{
        borderColor: principalColors.borderMuted,
        background: candidate.is_current_hod ? principalColors.surfaceTint : undefined,
        boxShadow: candidate.is_current_hod ? `inset 3px 0 0 ${principalColors.primary}` : undefined,
      }}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={candidate.name} index={index} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold" style={{ color: principalColors.heading }}>
              {candidate.name}
            </div>
            <div className="text-[12px]" style={{ color: principalColors.textFaint }}>
              {candidate.staff_code ?? "—"}
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-sm" style={{ color: principalColors.body }}>
        {candidate.is_current_hod && (
          <span
            className="mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
            style={{ background: principalColors.primary, color: "#fff" }}
          >
            CURRENT HOD
          </span>
        )}
        {candidate.designation}
      </td>
      <td className="w-[64px] px-3 py-3.5 text-sm leading-tight" style={{ color: principalColors.body }}>
        <div className="flex flex-col">
          {qualificationLines(candidate.qualification).map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      </td>
      <td className="px-3 py-3.5 text-right tabular-nums text-sm" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
        {candidate.experience_years != null ? `${candidate.experience_years} yrs` : "—"}
      </td>
      <td className="px-3 py-3.5 text-right tabular-nums text-sm" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
        {candidate.attendance_percentage != null ? `${candidate.attendance_percentage}%` : "—"}
      </td>
      <td className="px-3 py-3.5 text-right tabular-nums text-sm" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
        {candidate.publications_count}
      </td>
      <td className="px-5 py-3.5 text-right">
        {candidate.is_current_hod ? (
          <span className="text-xs font-semibold" style={{ color: principalColors.textFaint }}>
            {candidate.hod_since ? `Since ${formatDate(candidate.hod_since)}` : "Current HoD"}
          </span>
        ) : (
          <button
            type="button"
            onClick={onViewProfile}
            className="h-8 rounded-lg px-3.5 text-xs font-bold text-white transition-colors"
            style={{ background: principalColors.primary }}
          >
            Appoint as HoD
          </button>
        )}
      </td>
    </tr>
  );
}

export default function PrincipalRoleAllocationPage() {
  const departments = useRoleAllocationDepartments();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("experience_years");
  const [viewingCandidateId, setViewingCandidateId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedId == null && departments.data && departments.data.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(departments.data[0].id);
    }
  }, [departments.data, selectedId]);

  const candidates = useRoleAllocationCandidates(selectedId ?? undefined);
  const history = useRoleAllocationHistory(selectedId ?? undefined);
  const appointHod = useAppointHod(selectedId ?? -1);

  const selected = departments.data?.find((d) => d.id === selectedId) ?? null;

  const visibleCandidates = useMemo(() => {
    const rows = candidates.data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter((c) => c.name.toLowerCase().includes(q) || (c.staff_code ?? "").toLowerCase().includes(q))
      : rows;
    return [...filtered].sort((a, b) => {
      if (a.is_current_hod) return -1;
      if (b.is_current_hod) return 1;
      return (b[sortBy] ?? 0) - (a[sortBy] ?? 0);
    });
  }, [candidates.data, search, sortBy]);

  const hodVacantCount = departments.data?.filter((d) => !d.hod).length ?? 0;
  const facultyOnRoll = departments.data?.reduce((sum, d) => sum + d.faculty_count, 0) ?? 0;

  function handleConfirmAppoint(candidateId: number, reason: string) {
    appointHod.mutate(
      { facultyId: candidateId, reason: reason.trim() || undefined },
      { onSuccess: () => setViewingCandidateId(null) },
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Role Allocation
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Review faculty experience and appoint or change a Head of Department for each department.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <PrincipalStatCard
          label="Departments"
          icon="account_tree"
          loading={departments.isLoading}
          value={departments.data?.length ?? 0}
          sub="under the Principal"
        />
        <PrincipalStatCard
          label="HoD vacant"
          icon="error"
          loading={departments.isLoading}
          value={hodVacantCount}
          sub="awaiting appointment"
        />
        <PrincipalStatCard
          label="Faculty on roll"
          icon="groups"
          loading={departments.isLoading}
          value={facultyOnRoll}
          sub="across all departments"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-2.5">
          <div className="px-1 text-xs font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
            DEPARTMENTS
          </div>
          {departments.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-xl" style={{ background: principalColors.surfaceMuted }} />
            ))}
          {departments.data?.map((dept) => (
            <DepartmentListItem
              key={dept.id}
              dept={dept}
              active={dept.id === selectedId}
              onSelect={() => {
                setSelectedId(dept.id);
                setSearch("");
                setViewingCandidateId(null);
              }}
            />
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div
            className="min-w-0 rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
            style={{ background: principalColors.bg, borderColor: principalColors.border }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="break-words text-[17px] font-bold"
                    style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
                  >
                    {selected?.name ?? "…"}
                  </span>
                  {selected && (
                    <span
                      className="rounded-full border px-2 py-0.5 text-[11px] font-bold"
                      style={{ borderColor: principalColors.chipBorder, color: principalColors.primaryDark }}
                    >
                      {selected.code}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
                  {selected
                    ? `${selected.faculty_count} faculty · ${selected.hod ? `current Head ${selected.hod.name}` : "no Head of Department"} · ${candidates.data?.length ?? 0} candidates listed`
                    : "Loading…"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Icon
                    name="search"
                    size={16}
                    style={{ color: principalColors.textSubtle }}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search a candidate"
                    className="h-9 w-52 rounded-lg border pl-8 pr-3 text-sm"
                    style={{ borderColor: principalColors.border, color: principalColors.heading }}
                  />
                </div>
                <div className="flex rounded-lg border p-0.5" style={{ borderColor: principalColors.border }}>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSortBy(opt.key)}
                      className="flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors"
                      style={{
                        background: sortBy === opt.key ? principalColors.primary : "transparent",
                        color: sortBy === opt.key ? "#fff" : principalColors.textFaint,
                      }}
                    >
                      <Icon name={opt.icon} size={15} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr style={{ background: principalColors.surfaceMuted }}>
                    {["FACULTY", "DESIGNATION", "QUAL.", "EXP.", "ATTENDANCE", "PAPERS", "ACTION"].map((h) => (
                      <th
                        key={h}
                        className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${
                          ["EXP.", "ATTENDANCE", "PAPERS", "ACTION"].includes(h) ? "text-right" : "text-left"
                        }`}
                        style={{ color: principalColors.textFaint }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidates.isLoading && <PrincipalTableSkeleton columns={7} />}
                  {!candidates.isLoading && visibleCandidates.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: principalColors.textFaint }}>
                        {search
                          ? `No candidates match "${search}".`
                          : "No active faculty on file for this department yet."}
                      </td>
                    </tr>
                  )}
                  {visibleCandidates.map((candidate, index) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      index={index}
                      onViewProfile={() => setViewingCandidateId(candidate.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className="rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
            style={{ background: principalColors.bg, borderColor: principalColors.border }}
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
              <div className="flex items-center gap-2">
                <Icon name="history" size={18} style={{ color: principalColors.primary }} />
                <span
                  className="text-[17px] font-bold"
                  style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
                >
                  Appointment history
                </span>
              </div>
              {selected && (
                <span className="text-xs" style={{ color: principalColors.textSubtle }}>
                  {selected.code} · last {Math.min(5, history.data?.length ?? 0)} changes
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr style={{ background: principalColors.surfaceMuted }}>
                    {["DATE", "CHANGE", "REASON", "CHANGED BY"].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold tracking-wider first:pl-5 last:pr-5"
                        style={{ color: principalColors.textFaint }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.isLoading && <PrincipalTableSkeleton columns={4} rows={3} />}
                  {!history.isLoading && (history.data?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm" style={{ color: principalColors.textFaint }}>
                        No appointment changes recorded for this department yet.
                      </td>
                    </tr>
                  )}
                  {history.data?.map((entry, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                      <td className="whitespace-nowrap px-5 py-3.5" style={{ color: principalColors.body }}>
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-[13px]" style={{ color: principalColors.heading }}>
                          <span style={{ color: principalColors.textFaint }}>{entry.from}</span>
                          <Icon name="arrow_right_alt" size={16} style={{ color: principalColors.primary }} />
                          <span className="font-semibold">{entry.to}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-[13px]" style={{ color: principalColors.body }}>
                        {entry.reason ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[13px]" style={{ color: principalColors.textFaint }}>
                        {entry.changed_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {viewingCandidateId != null && (
        <CandidateProfileModal
          candidateId={viewingCandidateId}
          onClose={() => setViewingCandidateId(null)}
          appointing={appointHod.isPending}
          onConfirmAppoint={(reason) => handleConfirmAppoint(viewingCandidateId, reason)}
        />
      )}
    </div>
  );
}
