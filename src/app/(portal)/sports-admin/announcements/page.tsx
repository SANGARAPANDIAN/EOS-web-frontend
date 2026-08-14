"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Button, Icon, Input, Modal, Select, SearchBar, SegmentedTabs, Textarea, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useSportsAnnouncements,
  useCreateSportsAnnouncement,
  useDeleteSportsAnnouncement,
  type SportsAnnouncement,
  type AnnouncementCategory,
} from "@/modules/sports-admin/api/announcements";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { useDepartments } from "@/modules/shared/api/departments";
import { formatDisplayDate } from "@/lib/utils/date";
import { downloadCsv } from "@/lib/utils/csv";
import { ApiError } from "@/types/api";

const CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  trials: "Trials",
  facility: "Facility",
  intramural: "Intramural",
  general: "General",
};

const CATEGORY_TONE: Record<AnnouncementCategory, BadgeTone> = {
  trials: "accentDark",
  facility: "neutral",
  intramural: "accent",
  general: "neutral",
};

const CATEGORY_PILLS: { key: "all" | AnnouncementCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "trials", label: "Trials" },
  { key: "facility", label: "Facility" },
  { key: "intramural", label: "Intramural" },
  { key: "general", label: "General" },
];

const YEAR_OPTIONS = ["I year", "II year", "III year", "IV year"];

/** Case-insensitive substring match against title + content preview — these announcements carry no dedicated sport/department/year columns, so "Sport"/"Department"/"Year" filter the same way the reference design's own generic filter row does: by matching the word against the announcement's text. */
function mentions(a: SportsAnnouncement, needle: string): boolean {
  const hay = `${a.title} ${a.sub}`.toLowerCase();
  return hay.includes(needle.toLowerCase());
}

export default function AnnouncementsPage() {
  const announcements = useSportsAnnouncements();
  const disciplines = useDisciplines();
  const departments = useDepartments();
  const createAnnouncement = useCreateSportsAnnouncement();
  const deleteAnnouncement = useDeleteSportsAnnouncement();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setTitle("");
    setContent("");
    setCategory("general");
    setError(null);
    setShowModal(true);
  }

  const [q, setQ] = useState("");
  const [sport, setSport] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [pill, setPill] = useState<"all" | AnnouncementCategory>("all");

  const loaded = useMemo(() => announcements.data ?? [], [announcements.data]);
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return loaded.filter((a) => {
      if (pill !== "all" && a.category !== pill) return false;
      if (sport && !mentions(a, sport)) return false;
      if (department && !mentions(a, department)) return false;
      if (year && !mentions(a, year)) return false;
      if (query && !`${a.title} ${a.sub}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [loaded, pill, sport, department, year, q]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createAnnouncement.mutateAsync({ title, content, category });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function handleExport() {
    downloadCsv(
      "sports-announcements",
      [
        { header: "Announcement", value: (a: SportsAnnouncement) => a.title },
        { header: "Category", value: (a: SportsAnnouncement) => CATEGORY_LABEL[a.category] },
        { header: "Posted", value: (a: SportsAnnouncement) => formatDisplayDate(a.posted_at) },
        { header: "Posted by", value: (a: SportsAnnouncement) => a.posted_by.email },
      ],
      rows,
    );
  }

  const columns: DataTableColumn<SportsAnnouncement>[] = [
    { key: "title", header: "Announcement", width: "1.5fr", render: (a) => <span className="font-bold text-ink">{a.title}</span> },
    {
      key: "audience",
      header: "Audience · Channel",
      width: "1.6fr",
      render: (a) => (
        <div>
          <div className="text-body">In-app notice</div>
          <div className="mt-0.5 truncate text-[12px] text-muted">{a.sub}</div>
        </div>
      ),
    },
    {
      key: "posted_at",
      header: "Posted",
      width: "0.9fr",
      render: (a) => <span className="font-mono text-[12.5px] text-muted">{formatDisplayDate(a.posted_at)}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "0.8fr",
      render: (a) => <Badge tone={CATEGORY_TONE[a.category]}>{CATEGORY_LABEL[a.category]}</Badge>,
    },
    {
      key: "manage",
      header: "Manage",
      width: "0.6fr",
      align: "right",
      render: (a) => (
        <button
          onClick={() => deleteAnnouncement.mutate(a.id)}
          className="text-[12px] font-bold text-muted hover:text-danger-fg"
        >
          Remove
        </button>
      ),
    },
  ];

  const hasActiveFilters = q !== "" || sport !== "" || department !== "" || year !== "" || pill !== "all";

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Announcements</h1>
          <p className="mt-1 text-[13.5px] text-muted">Notices published to athletes, coaches and departments</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
            Export
          </Button>
          <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
            <Icon name="add" size={16} />
            New announcement
          </Button>
        </div>
      </div>

      <Card className="flex flex-col gap-3.5 p-4">
        <SearchBar
          className="max-w-none"
          placeholder="Search announcements by title or content"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-muted">Sport</span>
            <Select className="w-auto" value={sport} onChange={(e) => setSport(e.target.value)}>
              <option value="">All</option>
              {disciplines.data?.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-muted">Department</span>
            <Select className="w-auto" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-muted">Year</span>
            <Select className="w-auto" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>

          <div className="h-6 w-px bg-border-default" />

          <SegmentedTabs
            options={CATEGORY_PILLS.map((p) => ({ key: p.key, label: p.label }))}
            value={pill}
            onChange={(key) => setPill(key as "all" | AnnouncementCategory)}
          />

          {hasActiveFilters && (
            <button
              onClick={() => {
                setQ("");
                setSport("");
                setDepartment("");
                setYear("");
                setPill("all");
              }}
              className="ml-auto text-[12.5px] font-bold text-primary hover:text-primary-dark"
            >
              Reset filters
            </button>
          )}
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(a) => a.id}
        title="Announcements register"
        titleNote={`Showing ${rows.length} of ${loaded.length} loaded record${loaded.length === 1 ? "" : "s"}`}
        emptyMessage={
          announcements.isLoading
            ? "Loading…"
            : loaded.length === 0
              ? "No announcements yet. Use + New announcement to post the first one."
              : "No announcements match these filters."
        }
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New announcement"
        subtitle="Published to athletes, coaches and departments"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Title</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Trials for U19 Basketball" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Content</label>
            <Textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Details for athletes and coaches…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Category</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!title || !content || createAnnouncement.isPending}>
              {createAnnouncement.isPending ? "Posting…" : "Post announcement"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
