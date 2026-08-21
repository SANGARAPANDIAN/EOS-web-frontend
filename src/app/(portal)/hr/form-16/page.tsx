"use client";

import { Card, Icon } from "@/components/ui";

export default function HrForm16Page() {
  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Form 16</h1>
        <p className="mt-1 text-[13px] text-muted">Generate, publish, and track Form 16 for faculty.</p>
      </div>

      <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-subtle">
          <Icon name="description" size={24} />
        </div>
        <p className="text-[16px] font-extrabold text-ink">Form 16 isn&apos;t available yet</p>
        <p className="max-w-sm text-[13px] text-muted">
          Form 16 generation depends on tax and salary-component data that isn&apos;t modeled in the backend yet. This
          page will let you generate, verify, and publish Form 16 once that&apos;s in place.
        </p>
      </Card>
    </div>
  );
}
