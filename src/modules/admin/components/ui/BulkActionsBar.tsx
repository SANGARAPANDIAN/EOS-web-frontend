import { Icon } from "@/components/ui/Icon";
import { Button } from "@/modules/admin/components/ui/Button";
import { Card } from "@/modules/admin/components/ui/Card";

interface BulkActionsBarProps {
  count: number;
  onNotify?: () => void;
  onExportSelected?: () => void;
  onGenerateIdCards?: () => void;
  onClearSelection: () => void;
}

/** Action bar shown above a table once rows are selected. */
export function BulkActionsBar({ count, onNotify, onExportSelected, onGenerateIdCards, onClearSelection }: BulkActionsBarProps) {
  return (
    <Card hoverable={false} className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="text-sm font-semibold text-admin-ink">{count} selected</span>
      <div className="ml-auto flex flex-wrap gap-2">
        {onNotify && (
          <Button variant="secondary" size="sm" onClick={onNotify}>
            <Icon name="notifications" size={15} /> Notify
          </Button>
        )}
        {onExportSelected && (
          <Button variant="secondary" size="sm" onClick={onExportSelected}>
            <Icon name="download" size={15} /> Export selected
          </Button>
        )}
        {onGenerateIdCards && (
          <Button variant="secondary" size="sm" onClick={onGenerateIdCards}>
            <Icon name="badge" size={15} /> Generate ID cards
          </Button>
        )}
        <Button variant="text" size="sm" onClick={onClearSelection}>
          Clear selection
        </Button>
      </div>
    </Card>
  );
}
