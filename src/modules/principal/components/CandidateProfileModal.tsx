import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import { useFacultyProfile } from "@/modules/principal/api/faculty";

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

function colorForId(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

/** Large header avatar — the real profile photo when one is on file, the same colored-initials fallback used everywhere else in this module otherwise. */
function ProfilePhoto({ name, id, photoUrl, size = 76 }: { name: string; id: number; photoUrl: string | null; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (photoUrl && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        onError={() => setImgFailed(true)}
        className="shrink-0 rounded-2xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-2xl text-xl font-extrabold text-white"
      style={{ width: size, height: size, background: colorForId(id) }}
    >
      {initialsOf(name)}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3.5" style={{ borderColor: principalColors.borderMuted, background: principalColors.surfaceMuted }}>
      <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: principalColors.textFaint }}>
        {label}
      </div>
      <div className="mt-1 text-[17px] font-extrabold" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.heading }}>
        {value}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size={16} style={{ color: principalColors.textSubtle, marginTop: 2 }} />
      <div>
        <div className="text-[11px]" style={{ color: principalColors.textFaint }}>
          {label}
        </div>
        <div className="text-[13px] font-medium" style={{ color: principalColors.body }}>
          {value}
        </div>
      </div>
    </div>
  );
}

interface CandidateProfileModalProps {
  candidateId: number;
  onClose: () => void;
  onConfirmAppoint: (reason: string) => void;
  appointing: boolean;
}

export function CandidateProfileModal({ candidateId, onClose, onConfirmAppoint, appointing }: CandidateProfileModalProps) {
  const profile = useFacultyProfile(candidateId);
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
        style={{ borderColor: principalColors.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: principalColors.borderLight }}>
          {profile.isLoading || !profile.data ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-[76px] w-[76px] rounded-2xl" />
              <div>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-3.5 w-28" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ProfilePhoto name={profile.data.name} id={candidateId} photoUrl={profile.data.photo_url} />
              <div>
                <div className="text-[20px] font-extrabold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                  {profile.data.name}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px]" style={{ color: principalColors.textFaint }}>
                  <span>{profile.data.designation}</span>
                  {profile.data.department && (
                    <>
                      <span>·</span>
                      <span className="rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ borderColor: principalColors.chipBorder, color: principalColors.primaryDark }}>
                        {profile.data.department.code}
                      </span>
                    </>
                  )}
                  {profile.data.staff_code && (
                    <>
                      <span>·</span>
                      <span>{profile.data.staff_code}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/5"
            style={{ color: principalColors.textFaint }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {profile.isLoading || !profile.data ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBlock label="Experience" value={profile.data.experience_years != null ? `${profile.data.experience_years} yrs` : "—"} />
                <StatBlock label="Attendance" value={profile.data.attendance_pct_this_term != null ? `${profile.data.attendance_pct_this_term}%` : "—"} />
                <StatBlock label="Publications" value={String(profile.data.publications_summary.total)} />
                <StatBlock label="Qualification" value={profile.data.qualification ?? "—"} />
              </div>

              <div>
                <div className="mb-2.5 text-[13px] font-bold" style={{ color: principalColors.heading }}>
                  Contact &amp; posting
                </div>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <InfoRow icon="mail" label="Institute email" value={profile.data.institute_email} />
                  <InfoRow icon="call" label="Phone" value={profile.data.phone} />
                  <InfoRow icon="door_front" label="Office room" value={profile.data.office_room} />
                  <InfoRow icon="location_on" label="Work location" value={profile.data.work_location} />
                  <InfoRow icon="event" label="Date of joining" value={profile.data.date_of_joining ? new Date(profile.data.date_of_joining).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                  <InfoRow icon="school" label="Specialization" value={profile.data.specialization} />
                </div>
              </div>

              {profile.data.publications_summary.total > 0 && (
                <div>
                  <div className="mb-2.5 text-[13px] font-bold" style={{ color: principalColors.heading }}>
                    Publications
                  </div>
                  <div className="flex flex-wrap gap-2 text-[12px]" style={{ color: principalColors.body }}>
                    <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>
                      {profile.data.publications_summary.journals} journals
                    </span>
                    <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>
                      {profile.data.publications_summary.conferences} conferences
                    </span>
                    <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>
                      {profile.data.publications_summary.books} books
                    </span>
                    <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>
                      {profile.data.publications_summary.total_citations} citations
                    </span>
                    <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>
                      h-index {profile.data.publications_summary.h_index}
                    </span>
                  </div>
                </div>
              )}

              {profile.data.awards.length > 0 && (
                <div>
                  <div className="mb-2.5 text-[13px] font-bold" style={{ color: principalColors.heading }}>
                    Awards
                  </div>
                  <ul className="flex flex-col gap-1.5 text-[13px]" style={{ color: principalColors.body }}>
                    {profile.data.awards.map((a, i) => (
                      <li key={i}>
                        {a.title} — {a.year}
                        {a.awarded_by ? ` · ${a.awarded_by}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {profile.data.responsibilities.length > 0 && (
                <div>
                  <div className="mb-2.5 text-[13px] font-bold" style={{ color: principalColors.heading }}>
                    Responsibilities
                  </div>
                  <ul className="flex flex-col gap-1.5 text-[13px]" style={{ color: principalColors.body }}>
                    {profile.data.responsibilities.map((r, i) => (
                      <li key={i}>
                        {r.title} · {r.academic_year}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5 border-t p-5" style={{ borderColor: principalColors.borderLight, background: principalColors.surfaceMuted }}>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for this appointment (optional)"
            disabled={appointing}
            className="h-10 rounded-lg border px-3 text-sm disabled:opacity-60"
            style={{ borderColor: principalColors.border, color: principalColors.heading, background: principalColors.bg }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={appointing}
              className="h-10 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
              style={{ color: principalColors.textFaint }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirmAppoint(reason)}
              disabled={appointing || profile.isLoading}
              className="h-10 rounded-lg px-5 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: principalColors.primary }}
            >
              {appointing ? "Appointing…" : "Confirm appointment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
