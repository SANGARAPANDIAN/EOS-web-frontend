import { Modal } from "@/components/ui/Modal";
import type { Company } from "../../types";

interface CompanyDetailModalProps {
  open: boolean;
  company: Company | null;
  onClose: () => void;
}

export function CompanyDetailModal({ open, company, onClose }: CompanyDetailModalProps) {
  if (!company) return null;

  return (
    <Modal open={open} onClose={onClose} title={company.name} className="max-w-lg">
      <div>
        <p className="text-xs font-semibold tracking-wide text-subtle uppercase">Profile info</p>
        <p className="mt-1 text-sm whitespace-pre-wrap text-body">{company.profileInfo || "No profile info added yet."}</p>
      </div>
    </Modal>
  );
}
