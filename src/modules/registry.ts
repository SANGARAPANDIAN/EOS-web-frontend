import type { ModuleConfig } from "@/modules/types";
import { studentModuleConfig } from "@/modules/student/nav";
import { hodModuleConfig } from "@/modules/hod/nav";
import { advisorModuleConfig } from "@/modules/advisor/nav";
import { edcModuleConfig } from "@/modules/edc/nav";
import { secretaryModuleConfig } from "@/modules/secretary/nav";
import { principalModuleConfig } from "@/modules/principal/nav";
import { transportModuleConfig } from "@/modules/transport/nav";
import { higherEducationModuleConfig } from "@/modules/higher-education/nav";
import { medicalCentreModuleConfig } from "@/modules/medical-centre/nav";
import { hostelWardenModuleConfig } from "@/modules/hostel-warden/nav";
import { adminModuleConfig } from "@/modules/admin/nav";
import { sportsAdminModuleConfig } from "@/modules/sports-admin/nav";
import { libraryModuleConfig } from "@/modules/library/nav";
import { placementModuleConfig } from "@/modules/placement/nav";
import { hrModuleConfig } from "@/modules/hr/nav";
import { gateWardenModuleConfig } from "@/modules/gate-warden/nav";
import { billingModuleConfig } from "@/modules/billing/nav";
import { coeModuleConfig } from "@/modules/coe/nav";

/**
 * Single lookup point from JWT role -> module shell config (nav groups, base
 * path). Adding a new module (e.g. faculty) means creating
 * `modules/faculty/nav.ts` and registering it here — the shell (Sidebar,
 * Topbar, AppShell) and route protection read from this registry and never
 * hardcode a role.
 */
export const MODULE_REGISTRY: Record<string, ModuleConfig> = {
  student: studentModuleConfig,
  hod: hodModuleConfig,
  faculty: advisorModuleConfig,
  edc_coordinator: edcModuleConfig,
  secretary: secretaryModuleConfig,
  principal: principalModuleConfig,
  transport: transportModuleConfig,
  higheredu: higherEducationModuleConfig,
  medical_centre: medicalCentreModuleConfig,
  warden: hostelWardenModuleConfig,
  admin: adminModuleConfig,
  sports_admin: sportsAdminModuleConfig,
  library: libraryModuleConfig,
  placement: placementModuleConfig,
  coe: coeModuleConfig,
};

export function getModuleConfig(role: string | undefined | null): ModuleConfig | null {
  if (!role) return null;
  return MODULE_REGISTRY[role] ?? null;
}
