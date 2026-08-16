"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card, Checkbox, PageHeader, Select, useToast } from "@/modules/admin/components/ui";
import { FACULTY_LIST_COLUMNS, useFacultyPreferences } from "@/modules/admin/lib/faculty-preferences";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function FacultySettingsPage() {
  const { show } = useToast();
  const { preferences, updatePreferences, toggleColumn } = useFacultyPreferences();

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <Link href="/admin/faculty" className="hover:text-admin-body">
          Faculty
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Settings</span>
      </nav>

      <PageHeader
        title="Faculty Module Settings"
        description="Display preferences for the All Faculty list — stored in this browser."
      />

      <Card hoverable={false} className="mt-5 max-w-2xl overflow-hidden">
        <div className="border-b border-admin-divider p-5">
          <h3 className="font-sans text-[15px] font-bold text-admin-ink">List defaults</h3>
          <p className="mt-0.5 text-sm text-admin-muted">Applied the next time you open All Faculty.</p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-admin-body">Rows per page</label>
              <Select
                value={preferences.pageSize}
                className="w-full"
                onChange={(e) => {
                  updatePreferences({ pageSize: Number(e.target.value) });
                  show("Saved.", "success");
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-admin-body">Sort by name</label>
              <Select
                value={preferences.sortDirection}
                className="w-full"
                onChange={(e) => {
                  updatePreferences({ sortDirection: e.target.value as "asc" | "desc" });
                  show("Saved.", "success");
                }}
              >
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-sans text-[15px] font-bold text-admin-ink">Visible columns</h3>
          <p className="mt-0.5 text-sm text-admin-muted">Faculty name is always shown. Turn off columns you don&apos;t need.</p>

          <div className="mt-4 flex flex-col gap-2.5">
            {FACULTY_LIST_COLUMNS.map((col) => (
              <label key={col.key} className="flex items-center gap-2.5 text-sm text-admin-body">
                <Checkbox
                  checked={!preferences.hiddenColumns.includes(col.key)}
                  onChange={() => {
                    toggleColumn(col.key);
                    show("Saved.", "success");
                  }}
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
