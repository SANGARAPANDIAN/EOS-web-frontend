"use client";

import { Card, EmptyState, Icon } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildEntrepreneurship } from "@/modules/parent/api/entrepreneurship";
import { EdcVentureDetail } from "@/modules/edc/EdcVentureDetail";

export default function ParentMyVenturePage() {
  const { selectedChildId } = useSelectedChild();
  const { data: venture, isLoading, error } = useChildEntrepreneurship(selectedChildId);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">My Venture</h1>
        <ChildSwitcher />
      </div>

      {isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : error ? (
        <Card>
          <EmptyState message={error instanceof Error ? error.message : "Could not load this venture."} />
        </Card>
      ) : !venture ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Icon name="rocket_launch" size={32} className="text-subtle" />
            <div className="text-[15px] font-bold text-ink">No venture registered with the EDC yet</div>
            <p className="max-w-md text-[13px] text-muted">
              Once the Entrepreneurship Development Cell records a venture, its details will show up here.
            </p>
          </div>
        </Card>
      ) : (
        <EdcVentureDetail row={venture} readOnly />
      )}
    </div>
  );
}
