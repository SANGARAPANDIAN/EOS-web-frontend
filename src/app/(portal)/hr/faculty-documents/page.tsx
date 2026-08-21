"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, EmptyState, Icon, SearchBar } from "@/components/ui";
import { useHrFaculties } from "@/modules/hr/api/facultyDirectory";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

export default function HrFacultyDocumentsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const faculty = useHrFaculties({ search: debouncedSearch || undefined, limit: 100 });

  const groups = useMemo(() => {
    const rows = faculty.data?.data ?? [];
    const byDept = new Map<number, { name: string; members: typeof rows }>();
    for (const member of rows) {
      const deptId = member.department?.id ?? 0;
      const deptName = member.department?.name ?? "Unassigned";
      if (!byDept.has(deptId)) byDept.set(deptId, { name: deptName, members: [] });
      byDept.get(deptId)!.members.push(member);
    }
    return Array.from(byDept.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [faculty.data]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Documents</h1>
        <p className="mt-1 text-[13.5px] text-muted">Browse faculty by department to view and manage their uploaded documents.</p>
      </div>

      <Card className="p-4">
        <SearchBar placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      {(faculty.isLoading || groups.length === 0) && (
        <Card>
          <EmptyState loading={faculty.isLoading} message="No faculty match this search." />
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <Card key={group.name} className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
              <h2 className="text-[15px] font-extrabold text-ink">{group.name}</h2>
              <span className="text-[12.5px] font-semibold text-muted">
                {group.members.length} faculty
              </span>
            </div>
            <div className="flex flex-col px-5">
              {group.members.map((member) => (
                <Link
                  key={member.id}
                  href={`/hr/faculty-directory/${member.id}`}
                  className="flex items-center gap-3 border-t border-divider py-3.5 first:border-0 hover:bg-surface-tint"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
                    <Icon name="folder_shared" size={17} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-ink">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-[12.5px] text-muted">
                      {member.designation} · ID {member.id}
                    </div>
                  </div>
                  <Icon name="chevron_right" size={17} className="shrink-0 text-subtle" />
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
