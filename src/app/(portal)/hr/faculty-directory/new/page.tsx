"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Icon, Input, Select } from "@/components/ui";
import { useCreateHrFaculty } from "@/modules/hr/api/facultyDirectory";
import { useHrDepartments } from "@/modules/hr/api/departments";
import { ApiError } from "@/types/api";

export default function AddHrFacultyPage() {
  const router = useRouter();
  const departments = useHrDepartments();
  const createFaculty = useCreateHrFaculty();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [designation, setDesignation] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim() && firstName.trim() && lastName.trim() && designation.trim() && departmentId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      const created = await createFaculty.mutateAsync({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        designation: designation.trim(),
        department_id: Number(departmentId),
        phone: phone.trim() || undefined,
        date_of_joining: dateOfJoining || undefined,
      });
      router.push(`/hr/faculty-directory/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        type="button"
        onClick={() => router.push("/hr/faculty-directory")}
        className="flex items-center gap-2 self-start text-[13px] font-bold text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Faculty directory
      </button>

      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Add faculty</h1>
        <p className="mt-1 text-[13.5px] text-muted">Creates a new faculty record in the directory.</p>
      </div>

      <Card className="max-w-[720px] p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">First name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Aditi" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Last name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rao" required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sece.ac.in" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Designation</label>
              <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Assistant Professor" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Department</label>
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                <option value="">Select department</option>
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
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Date of joining</label>
              <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => router.push("/hr/faculty-directory")}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!canSubmit || createFaculty.isPending}>
              {createFaculty.isPending ? "Creating…" : "Create faculty"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
