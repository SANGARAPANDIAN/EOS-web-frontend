"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { useStudentProjects } from "@/modules/admin/api/students";
import { SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

export function ProjectsSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentProjects(studentId, active);
  if (isLoading || !data) return <Stub message="Loading…" />;

  const links: Array<[string, string | null]> = [
    ["Resume", data.profile?.resume_url ?? null],
    ["LinkedIn", data.profile?.linkedin_url ?? null],
    ["GitHub", data.profile?.github_url ?? null],
    ["LeetCode", data.profile?.leetcode_url ?? null],
    ["HackerRank", data.profile?.hackerrank_url ?? null],
    ["Codeforces", data.profile?.codeforces_url ?? null],
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Profile links">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {links.map(([label, url]) => (
            <div key={label} className="min-w-0">
              <p className="mb-1 text-xs font-medium text-admin-muted">{label}</p>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="truncate text-sm text-admin-primary hover:underline">
                  {url}
                </a>
              ) : (
                <p className="text-sm italic text-admin-subtle">Not recorded</p>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Projects">
        <SimpleTable
          headers={["Title", "Description", "Mentor"]}
          emptyMessage="No projects on record."
          rows={data.projects.map((p) => [p.title, p.description ?? "—", p.faculty ? `${p.faculty.first_name} ${p.faculty.last_name}` : "—"])}
        />
      </SectionCard>
    </div>
  );
}
