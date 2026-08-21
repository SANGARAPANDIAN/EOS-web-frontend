"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Icon,
  Input,
  Modal,
  ProgressBar,
  Select,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useHrFacultyActivity,
  useHrFacultyById,
  useUpdateHrFaculty,
  type HrFacultyStatus,
} from "@/modules/hr/api/facultyDirectory";
import { useHrDepartments } from "@/modules/hr/api/departments";
import {
  useDeleteHrFacultyDocument,
  useHrFacultyDocuments,
  useUploadHrFacultyDocument,
} from "@/modules/hr/api/facultyDocuments";
import { useHrFacultyAttendance } from "@/modules/hr/api/facultyAttendance";
import { formatDisplayDate, formatRelativeTime } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<HrFacultyStatus, BadgeTone> = {
  active: "accent",
  inactive: "neutral",
};

export default function HrFacultyDetailPage({ params }: { params: Promise<{ facultyId: string }> }) {
  const { facultyId } = use(params);
  const id = Number(facultyId);
  const router = useRouter();

  const faculty = useHrFacultyById(id);
  const activity = useHrFacultyActivity(id);
  const attendance = useHrFacultyAttendance(id);
  const documents = useHrFacultyDocuments(id);
  const departments = useHrDepartments();
  const updateFaculty = useUpdateHrFaculty();
  const uploadDocument = useUploadHrFacultyDocument(id);
  const deleteDocument = useDeleteHrFacultyDocument(id);

  const f = faculty.data;

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editStatus, setEditStatus] = useState<HrFacultyStatus>("active");
  const [editPhone, setEditPhone] = useState("");
  const [editDateOfJoining, setEditDateOfJoining] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  function openEditModal() {
    if (!f) return;
    setEditFirstName(f.first_name);
    setEditLastName(f.last_name);
    setEditDesignation(f.designation);
    setEditDepartmentId(String(f.department_id));
    setEditStatus(f.status);
    setEditPhone(f.phone ?? "");
    setEditDateOfJoining(f.date_of_joining ? f.date_of_joining.slice(0, 10) : "");
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    try {
      await updateFaculty.mutateAsync({
        id,
        input: {
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          designation: editDesignation.trim(),
          department_id: Number(editDepartmentId),
          status: editStatus,
          phone: editPhone.trim() || undefined,
          date_of_joining: editDateOfJoining || undefined,
        },
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadType.trim()) {
      setUploadError("Pick a file and give it a document type.");
      return;
    }
    setUploadError(null);
    try {
      await uploadDocument.mutateAsync({ file: uploadFile, documentType: uploadType.trim() });
      setUploadFile(null);
      setUploadType("");
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Could not upload this document.");
    }
  }

  function handleDeleteConfirm() {
    if (deleteTargetId === null) return;
    deleteDocument.mutate(deleteTargetId, { onSuccess: () => setDeleteTargetId(null) });
  }

  const overall = attendance.data?.overall;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        onClick={() => router.push("/hr/faculty-directory")}
        className="flex items-center gap-2 self-start text-[13px] font-bold text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Faculty directory
      </button>

      {!f ? (
        <Card>
          <EmptyState loading={faculty.isLoading} message="Faculty not found." />
        </Card>
      ) : (
        <>
          <Card className="flex gap-6 p-6">
            <Avatar name={`${f.first_name} ${f.last_name}`} imageUrl={f.profile_url} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-[26px] font-extrabold tracking-[-.02em] text-ink">
                  {f.first_name} {f.last_name}
                </h1>
                <Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge>
                <Button variant="secondary" onClick={openEditModal}>
                  Edit
                </Button>
              </div>
              <p className="mt-1 text-[13.5px] text-muted">{[f.designation, f.department?.name].filter(Boolean).join(" · ")}</p>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  { label: "Employee ID", value: String(f.id) },
                  { label: "Department", value: f.department?.name ?? "—" },
                  { label: "Joined", value: f.date_of_joining ? formatDisplayDate(f.date_of_joining) : "—" },
                  { label: "Phone", value: f.phone ?? "—" },
                ].map((k) => (
                  <div key={k.label} className="rounded-[11px] border border-border-default bg-surface-muted p-3">
                    <div className="text-[10px] font-extrabold tracking-[.07em] text-subtle uppercase">{k.label}</div>
                    <div className="mt-1 truncate text-[14.5px] font-bold text-ink">{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 items-start gap-4">
            <Card>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Contact & employment</h2>
              <div className="mt-3 flex flex-col">
                {[
                  { label: "Email", value: f.email },
                  { label: "Phone", value: f.phone ?? "—" },
                  { label: "Designation", value: f.designation },
                  { label: "Department", value: f.department?.name ?? "—" },
                  { label: "Date of joining", value: f.date_of_joining ? formatDisplayDate(f.date_of_joining) : "—" },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-divider py-2.5 first:border-0">
                    <span className="text-[12.5px] font-semibold text-muted">{row.label}</span>
                    <span className="text-right text-[13.5px] font-bold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Attendance</h2>
                <Link href={`/hr/faculty-attendance/${f.id}`} className="text-[12.5px] font-bold text-primary hover:underline">
                  Full history
                </Link>
              </div>
              {attendance.isLoading || !overall ? (
                <EmptyState loading={attendance.isLoading} message="No attendance data yet." />
              ) : (
                <>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-[28px] font-extrabold tracking-[-.02em] text-ink">{overall.attendance_percentage}%</span>
                    <span className="text-[12.5px] text-muted">attendance so far</span>
                  </div>
                  <ProgressBar percent={overall.attendance_percentage} height={6} className="mt-2.5" />
                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Full days", value: overall.full_days },
                      { label: "Half days", value: overall.half_days },
                      { label: "Absent", value: overall.absent },
                      { label: "On leave", value: overall.on_leave },
                      { label: "On duty", value: overall.on_duty },
                      { label: "Vacation", value: overall.on_vacation },
                    ].map((s) => (
                      <div key={s.label} className="rounded-[9px] bg-surface-muted p-2">
                        <div className="text-[15px] font-extrabold text-ink">{s.value}</div>
                        <div className="text-[10px] font-bold text-subtle">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          <Card>
            <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Documents</h2>

            <form onSubmit={handleUpload} className="mt-3 flex flex-wrap items-end gap-3 rounded-[11px] border border-border-default bg-surface-muted p-3.5">
              <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
                <label className="text-[12px] font-bold text-primary">Document type</label>
                <Input value={uploadType} onChange={(e) => setUploadType(e.target.value)} placeholder="e.g. PAN card" />
              </div>
              <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                <label className="text-[12px] font-bold text-primary">File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full text-[12.5px] text-body file:mr-3 file:cursor-pointer file:rounded-[8px] file:border file:border-border-default file:bg-surface file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-primary"
                />
              </div>
              <Button type="submit" variant="primarySmall" className="w-auto" disabled={uploadDocument.isPending}>
                {uploadDocument.isPending ? "Uploading…" : "Upload"}
              </Button>
            </form>
            {uploadError && <div className="mt-2 text-[13px] font-semibold text-danger-fg">{uploadError}</div>}

            <div className="mt-3 flex flex-col">
              {documents.isLoading || (documents.data ?? []).length === 0 ? (
                <EmptyState loading={documents.isLoading} message="No documents uploaded yet." />
              ) : (
                documents.data!.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
                      <Icon name="description" size={17} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-ink">{doc.file_name}</div>
                      <div className="text-[12.5px] text-muted">
                        {doc.document_type} · {formatRelativeTime(doc.uploaded_at)}
                      </div>
                    </div>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-[8px] border border-border-default p-2 text-muted hover:bg-surface-tint hover:text-primary"
                        aria-label={`Download ${doc.file_name}`}
                      >
                        <Icon name="download" size={17} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(doc.id)}
                      className="shrink-0 rounded-[8px] border border-border-default p-2 text-muted hover:bg-danger-bg hover:text-danger-fg"
                      aria-label={`Delete ${doc.file_name}`}
                    >
                      <Icon name="delete" size={17} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Activity log</h2>
            <div className="mt-3 flex flex-col">
              {activity.isLoading || (activity.data ?? []).length === 0 ? (
                <EmptyState loading={activity.isLoading} message="No recorded activity for this faculty yet." />
              ) : (
                activity.data!.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2.5 border-t border-divider py-3 first:border-0 first:pt-0">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold leading-snug text-ink">{entry.description}</div>
                      <div className="mt-0.5 text-[12px] text-subtle">
                        {formatRelativeTime(entry.created_at)} · {entry.created_by_email}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit faculty" subtitle={`${f.first_name} ${f.last_name}`}>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">First name</label>
                  <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Last name</label>
                  <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Designation</label>
                  <Input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Department</label>
                  <Select value={editDepartmentId} onChange={(e) => setEditDepartmentId(e.target.value)} required>
                    {departments.data?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Phone</label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Date of joining</label>
                  <Input type="date" value={editDateOfJoining} onChange={(e) => setEditDateOfJoining(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-primary">Status</label>
                <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as HrFacultyStatus)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
              {editError && (
                <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                  {editError}
                </div>
              )}
              <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primarySmall" className="px-6" disabled={updateFaculty.isPending}>
                  {updateFaculty.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={deleteTargetId !== null}
            title="Delete document"
            description="This document will be permanently removed from the faculty's record."
            confirmLabel="Delete"
            destructive
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTargetId(null)}
          />
        </>
      )}
    </div>
  );
}
