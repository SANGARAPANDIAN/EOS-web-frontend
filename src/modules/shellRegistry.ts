import type { ComponentType, ReactNode } from "react";
import { AcademicCoordinatorShell } from "@/modules/academic-coordinator/components/AcademicCoordinatorShell";
import { StudentShell } from "@/modules/student/StudentShell";
import { HodShell } from "@/modules/hod/HodShell";
import { AdvisorShell } from "@/modules/advisor/AdvisorShell";
import { EdcShell } from "@/modules/edc/EdcShell";
import { SecretaryShell } from "@/modules/secretary/SecretaryShell";
import { PrincipalShell } from "@/modules/principal/PrincipalShell";
import { TransportShell } from "@/modules/transport/TransportShell";
import { HigherEducationShell } from "@/modules/higher-education/HigherEducationShell";
import { MedicalCentreShell } from "@/modules/medical-centre/MedicalCentreShell";
import { HostelWardenShell } from "@/modules/hostel-warden/HostelWardenShell";
import { AdminShell } from "@/modules/admin/AdminShell";
import { SportsAdminShell } from "@/modules/sports-admin/SportsAdminShell";
import { LibraryShell } from "@/modules/library/LibraryShell";
import { PlacementShell } from "@/modules/placement/PlacementShell";
import { MediaRoomShell } from "@/modules/media-room/MediaRoomShell";
import { HrShell } from "@/modules/hr/HrShell";
import { GateWardenShell } from "@/modules/gate-warden/GateWardenShell";
import { BillingShell } from "@/modules/billing/BillingShell";
import { CoeShell } from "@/modules/coe/CoeShell";
import { IqacShell } from "@/modules/iqac/IqacShell";
import { FinanceShell } from "@/modules/finance/FinanceShell";

type ShellComponent = ComponentType<{ children: ReactNode }>;

/**
 * Single lookup point from JWT role -> that role's REAL portal shell
 * component — the exact one every one of that role's own pages already
 * renders through, not a second, parallel reconstruction of it.
 *
 * Why this exists (not just `registry.ts`'s ModuleConfig lookup): some
 * shells build their sidebar from live data rather than a static nav list —
 * e.g. AdvisorShell's "MY CLASS" group only appears for faculty who are an
 * active class mentor this year, decided by a real API call
 * (useIsClassAdvisor()). Its own nav.ts export (`advisorModuleConfig`) is a
 * deliberately-empty compatibility shim for code that only needs
 * {role, basePath, moduleLabel} — trying to render a sidebar from it
 * produces a real-looking but completely empty nav, which is exactly the
 * "sidebar disappeared" bug this registry exists to prevent. Any future
 * role-agnostic consumer that needs a real, live-correct sidebar (currently
 * just MessagesShell) must render through THIS registry, never attempt to
 * reconstruct a role's nav generically from a static config.
 */
export const SHELL_REGISTRY: Record<string, ShellComponent> = {
  academic_coordinator: AcademicCoordinatorShell,
  student: StudentShell,
  hod: HodShell,
  faculty: AdvisorShell,
  edc_coordinator: EdcShell,
  secretary: SecretaryShell,
  principal: PrincipalShell,
  transport: TransportShell,
  higheredu: HigherEducationShell,
  medical_centre: MedicalCentreShell,
  warden: HostelWardenShell,
  admin: AdminShell,
  sports_admin: SportsAdminShell,
  library: LibraryShell,
  placement: PlacementShell,
  media_room: MediaRoomShell,
  hr_payroll: HrShell,
  gate_warden: GateWardenShell,
  billing: BillingShell,
  coe: CoeShell,
  iqac: IqacShell,
  finance: FinanceShell,
};

export function getShellForRole(role: string | undefined | null): ShellComponent | null {
  if (!role) return null;
  return SHELL_REGISTRY[role] ?? null;
}
