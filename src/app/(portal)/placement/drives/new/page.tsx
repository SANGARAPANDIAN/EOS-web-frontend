"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ScheduleDriveForm } from "@/modules/placement/components/drives/ScheduleDriveForm";

export default function ScheduleDrivePage() {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <nav className="text-sm text-muted">
          <Link href="/placement" className="hover:text-body">
            Dashboard
          </Link>
          <span className="mx-1.5">›</span>
          <Link href="/placement/drives" className="hover:text-body">
            Placement Drives
          </Link>
          <span className="mx-1.5">›</span>
          <span className="font-medium text-body">Schedule drive</span>
        </nav>
        <Link href="/placement/drives" className="flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <Icon name="chevron_left" size={16} /> Back to drives
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-ink">Schedule drive</h1>

      <ScheduleDriveForm />
    </div>
  );
}
