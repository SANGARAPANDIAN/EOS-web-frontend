"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/modules/admin/components/ui";
import { ScheduleDriveForm } from "@/modules/placement/components/drives/ScheduleDriveForm";

export default function ScheduleDrivePage() {
  return (
    <div className="flex flex-col gap-5">
      <nav className="flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/placement" className="hover:text-admin-body">
          Dashboard
        </Link>
        <Icon name="chevron_right" size={15} />
        <Link href="/placement/drives" className="hover:text-admin-body">
          Placement Drives
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Schedule drive</span>
      </nav>

      <PageHeader title="Schedule drive" description="Set up a new recruiter drive — eligibility, rounds and disclosure." />

      <ScheduleDriveForm />
    </div>
  );
}
