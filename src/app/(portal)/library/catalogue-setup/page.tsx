"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SegmentedPillToggle } from "@/modules/admin/components/ui";
import { CategoriesPanel } from "@/modules/library/components/catalogue-setup/CategoriesPanel";
import { RacksPanel } from "@/modules/library/components/catalogue-setup/RacksPanel";

type Tab = "categories" | "racks";

export default function CatalogueSetupPage() {
  const [tab, setTab] = useState<Tab>("categories");

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/library/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Categories &amp; racks</span>
      </nav>

      <div className="mb-6">
        <SegmentedPillToggle
          options={[
            { value: "categories", label: "Categories" },
            { value: "racks", label: "Racks" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "categories" ? <CategoriesPanel /> : <RacksPanel />}
    </div>
  );
}
