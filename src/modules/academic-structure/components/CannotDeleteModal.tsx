import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

interface CannotDeleteModalProps {
  open: boolean;
  onClose: () => void;
  label: string;
  /** e.g. ["1 course", "5 classes"] — rendered as a bullet list. */
  blockers: string[];
}

/**
 * Matches the reference's "Cannot delete" flow: no confirm action, since the
 * real onDelete: NoAction foreign keys mean the delete would simply fail —
 * this just explains what's in the way before the user tries.
 */
export function CannotDeleteModal({ open, onClose, label, blockers }: CannotDeleteModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`Cannot delete ${label}`} subtitle="Something still points at it." className="max-w-md">
      <div className="flex gap-3">
        <Icon name="warning" size={20} className="mt-0.5 shrink-0 text-danger-fg" />
        <div>
          <ul className="m-0 flex flex-col gap-[3px] pl-[18px] text-[13px] text-body">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs text-muted">
            Remove or move those first. This is not a caution — the foreign keys are declared NoAction, so the delete would
            simply fail.
          </p>
        </div>
      </div>
      <div className="mt-4.5 flex justify-end border-t border-border-default pt-3.5">
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
