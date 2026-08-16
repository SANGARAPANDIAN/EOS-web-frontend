"use client";

import { useParams } from "next/navigation";
import { useFacultyById } from "@/modules/admin/api/faculty";
import { FacultyEditForm } from "@/modules/admin/components/faculty/FacultyEditForm";

export default function FacultyEditPage() {
  const params = useParams<{ id: string }>();
  const facultyId = Number(params.id);

  const { data: faculty, isLoading, error } = useFacultyById(Number.isFinite(facultyId) ? facultyId : null);

  if (isLoading) {
    return <p className="text-sm text-admin-muted">Loading faculty…</p>;
  }

  if (error || !faculty) {
    return <p className="text-sm text-admin-danger">Couldn&apos;t load this faculty record.</p>;
  }

  return <FacultyEditForm faculty={faculty} />;
}
