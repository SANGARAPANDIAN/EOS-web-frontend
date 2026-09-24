import type { ModuleConfig } from "@/modules/types";
import { academicCoordinatorModuleConfig } from "@/modules/academic-coordinator/nav";
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
import { mediaRoomModuleConfig } from "@/modules/media-room/nav";
import { hrModuleConfig } from "@/modules/hr/nav";
import { gateWardenModuleConfig } from "@/modules/gate-warden/nav";
import { billingModuleConfig } from "@/modules/billing/nav";
import { coeModuleConfig } from "@/modules/coe/nav";
import { iqacModuleConfig } from "@/modules/iqac/nav";
import { financeModuleConfig } from "@/modules/finance/nav";
import { canteenAdminModuleConfig } from "@/modules/canteen-admin/nav";
import { canteenCashierModuleConfig } from "@/modules/canteen-cashier/nav";
import { parentModuleConfig } from "@/modules/parent/nav";

/**
 * Roles with real backend support (a working `/me/...` API, confirmed by the
 * backend's own `ROLES` constant) but no dedicated portal built yet — no
 * `nav.ts`, no `(portal)/<role>/dashboard` page. Without an entry here,
 * `getModuleConfig()` returns null and any page that calls it generically
 * (MessagesShell, the root redirect) renders blank instead of a real shell —
 * this is exactly the "sidebar disappears" bug these three plug. `homeHref`
 * sends them straight to the one real feature they do have (messaging)
 * instead of a dashboard route that doesn't exist.
 */
function messagingOnlyModuleConfig(
  role: string,
  moduleLabel: string,
  options?: { excludeOrderFood?: boolean },
): ModuleConfig {
  return {
    role,
    basePath: "/messages",
    homeHref: "/messages",
    moduleLabel,
    navGroups: [{ label: "Menu", items: [] }],
    excludeOrderFood: options?.excludeOrderFood,
  };
}

/**
 * Single lookup point from JWT role -> module shell config (nav groups, base
 * path). Adding a new module (e.g. faculty) means creating
 * `modules/faculty/nav.ts` and registering it here — the shell (Sidebar,
 * Topbar, AppShell) and route protection read from this registry and never
 * hardcode a role.
 */
export const MODULE_REGISTRY: Record<string, ModuleConfig> = {
  academic_coordinator: academicCoordinatorModuleConfig,
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
  media_room: mediaRoomModuleConfig,
  hr_payroll: hrModuleConfig,
  gate_warden: gateWardenModuleConfig,
  billing: billingModuleConfig,
  coe: coeModuleConfig,
  iqac: iqacModuleConfig,
  finance: financeModuleConfig,
  canteen_admin: canteenAdminModuleConfig,
  canteen_cashier: canteenCashierModuleConfig,
  parent: parentModuleConfig,
  alumni: messagingOnlyModuleConfig("alumni", "Alumni"),
  non_teaching_staff: messagingOnlyModuleConfig("non_teaching_staff", "Staff"),
};

export function getModuleConfig(role: string | undefined | null): ModuleConfig | null {
  if (!role) return null;
  return MODULE_REGISTRY[role] ?? null;
}
