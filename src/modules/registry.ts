import type { ModuleConfig } from "@/modules/types";
import { studentModuleConfig } from "@/modules/student/nav";
import { advisorModuleConfig } from "@/modules/advisor/nav";
import { edcModuleConfig } from "@/modules/edc/nav";

/**
 * Single lookup point from JWT role -> module shell config (nav groups, base
 * path). Adding a new module (e.g. faculty) means creating
 * `modules/faculty/nav.ts` and registering it here — the shell (Sidebar,
 * Topbar, AppShell) and route protection read from this registry and never
 * hardcode a role.
 */
export const MODULE_REGISTRY: Record<string, ModuleConfig> = {
  student: studentModuleConfig,
  faculty: advisorModuleConfig,
  edc_coordinator: edcModuleConfig,
};

export function getModuleConfig(role: string | undefined | null): ModuleConfig | null {
  if (!role) return null;
  return MODULE_REGISTRY[role] ?? null;
}
