import { MedicalCentreShell } from "@/modules/medical-centre/MedicalCentreShell";

export default function MedicalCentreLayout({ children }: { children: React.ReactNode }) {
  return <MedicalCentreShell>{children}</MedicalCentreShell>;
}
