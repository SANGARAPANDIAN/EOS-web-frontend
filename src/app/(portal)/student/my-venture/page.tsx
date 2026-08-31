"use client";

import { Card, EmptyState, Icon } from "@/components/ui";
import { useMyEntrepreneurship } from "@/modules/student/api/entrepreneurship";
import { EdcVentureDetail } from "@/modules/edc/EdcVentureDetail";

export default function StudentMyVenturePage() {
  const { data: venture, isLoading, error } = useMyEntrepreneurship();

  if (isLoading) {
    return (
      <Card>
        <EmptyState message="Loading…" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <EmptyState message={error instanceof Error ? error.message : "Could not load your venture."} />
      </Card>
    );
  }

  if (!venture) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Icon name="rocket_launch" size={32} className="text-subtle" />
          <div className="text-[15px] font-bold text-ink">You haven&apos;t registered a venture with the EDC yet</div>
          <p className="max-w-md text-[13px] text-muted">
            If you&apos;re building a startup or business idea, ask the Entrepreneurship Development Cell to add you — once they do,
            your venture details will show up here.
          </p>
        </div>
      </Card>
    );
  }

  return <EdcVentureDetail row={venture} readOnly />;
}
