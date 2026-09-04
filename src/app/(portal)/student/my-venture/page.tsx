"use client";

import { Card, EmptyState, Icon } from "@/components/ui";
import { useMyEntrepreneurship } from "@/modules/student/api/entrepreneurship";
import { EdcVentureDetail } from "@/modules/edc/EdcVentureDetail";

export default function StudentMyVenturePage() {
  const { data: venture, isLoading, error } = useMyEntrepreneurship();

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">My Venture</h1>
      </div>

      {isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : error ? (
        <Card>
          <EmptyState message={error instanceof Error ? error.message : "Could not load your venture."} />
        </Card>
      ) : !venture ? (
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
      ) : (
        <EdcVentureDetail row={venture} readOnly />
      )}
    </div>
  );
}
