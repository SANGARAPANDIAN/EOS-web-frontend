"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Button, PageHeader } from "@/modules/admin/components/ui";
import { FacultyCreateWizard } from "@/modules/admin/components/faculty/FacultyCreateWizard";

export default function AddFacultyPage() {
  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <Link href="/admin/faculty" className="hover:text-admin-body">
          Faculty
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Add Faculty</span>
      </nav>

      <PageHeader
        title="Add Faculty"
        actions={
          <Link href="/admin/faculty">
            <Button variant="secondary">
              <Icon name="arrow_back" size={16} /> Back to list
            </Button>
          </Link>
        }
      />

      <div className="mt-5">
        <FacultyCreateWizard />
      </div>
    </div>
  );
}
