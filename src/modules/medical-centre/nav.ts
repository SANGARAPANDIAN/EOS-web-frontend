import type { ModuleConfig } from "@/modules/types";

const BASE = "/medical-centre";

export const medicalCentreModuleConfig: ModuleConfig = {
  role: "medical_centre",
  basePath: BASE,
  moduleLabel: "Medical centre",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "reports", label: "Reports & analytics", icon: "monitoring", href: `${BASE}/reports` },
        { key: "advisories", label: "Health advisories", icon: "campaign", href: `${BASE}/advisories` },
      ],
    },
    {
      // Sits ahead of Clinical on purpose: a booking is what happens *before*
      // a patient ever reaches the OPD queue. Nothing here enters that queue
      // until staff approves it on the Bookings page.
      label: "Appointments",
      items: [
        { key: "appointment-slots", label: "Date & time slots", icon: "event_available", href: `${BASE}/appointments/slots` },
        { key: "appointment-bookings", label: "Bookings", icon: "how_to_reg", href: `${BASE}/appointments/bookings` },
      ],
    },
    {
      label: "Clinical",
      items: [
        { key: "opd", label: "OPD queue", icon: "healing", href: `${BASE}/opd`, badgeKey: "mcOpdWaiting" },
        { key: "records", label: "Health records", icon: "folder_shared", href: `${BASE}/records` },
        { key: "sickroom", label: "Sick room", icon: "bed", href: `${BASE}/sickroom`, badgeKey: "mcBedsOccupied" },
        { key: "billing", label: "Billing", icon: "receipt_long", href: `${BASE}/billing` },
      ],
    },
    {
      label: "Resources",
      items: [
        { key: "pharmacy", label: "Pharmacy stock", icon: "medication", href: `${BASE}/pharmacy`, badgeKey: "mcLowStock" },
        { key: "equipment", label: "Equipment", icon: "inventory_2", href: `${BASE}/equipment` },
        { key: "ambulance", label: "Ambulance", icon: "emergency", href: `${BASE}/ambulance` },
      ],
    },
    {
      label: "People",
      items: [
        { key: "team", label: "Medical team", icon: "groups", href: `${BASE}/team` },
        { key: "camps", label: "Camps & checkups", icon: "health_and_safety", href: `${BASE}/camps` },
      ],
    },
  ],
};
