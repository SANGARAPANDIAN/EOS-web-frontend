"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, Badge, Button, Input, Select, DataTable, type DataTableColumn } from "@/components/ui";
import {
  useHigherEducationUniversities,
  useCreateUniversity,
  type UniversityRow,
  type UniversityRelation,
} from "@/modules/higher-education/api/universities";

/** Matches the Transport dashboard/routes hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

const RELATION_LABEL: Record<UniversityRelation, string> = {
  mou_active: "MoU active",
  regular: "Regular",
  national: "National",
  affiliating: "Affiliating",
  new: "New",
};

const RELATION_OPTIONS: UniversityRelation[] = ["new", "mou_active", "regular", "national", "affiliating"];

function AddUniversityModal({ onClose }: { onClose: () => void }) {
  const createUniversity = useCreateUniversity();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [programmes, setProgrammes] = useState("");
  const [applied, setApplied] = useState("");
  const [admits, setAdmits] = useState("");
  const [funded, setFunded] = useState("");
  const [relation, setRelation] = useState<UniversityRelation>("new");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !country.trim()) {
      setError("University and country are required.");
      return;
    }
    setError(null);
    try {
      await createUniversity.mutateAsync({
        name: name.trim(),
        country: country.trim(),
        programmes: programmes.trim() || undefined,
        applied_count: applied ? Number(applied) : undefined,
        admits_count: admits ? Number(admits) : undefined,
        funded_count: funded ? Number(funded) : undefined,
        relation,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this university.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-14">
      <div className="w-full max-w-[600px] rounded-modal bg-surface">
        <div className="flex items-start justify-between gap-5 border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Add university</div>
            <div className="mt-1 text-[13px] text-muted">Fields left blank stay unrecorded and can be filled later.</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">University</label>
            <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Country</label>
            <Input className="mt-1.5" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Programmes</label>
            <Input className="mt-1.5" placeholder="e.g. MS CS, MS DS" value={programmes} onChange={(e) => setProgrammes(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Applied</label>
            <Input className="mt-1.5" type="number" value={applied} onChange={(e) => setApplied(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Admits</label>
            <Input className="mt-1.5" type="number" value={admits} onChange={(e) => setAdmits(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Funded</label>
            <Input className="mt-1.5" type="number" value={funded} onChange={(e) => setFunded(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Relation</label>
            <Select className="mt-1.5" value={relation} onChange={(e) => setRelation(e.target.value as UniversityRelation)}>
              {RELATION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {RELATION_LABEL[r]}
                </option>
              ))}
            </Select>
          </div>
          {error && <div className="col-span-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={createUniversity.isPending}>
            Save university
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HigherEducationUniversitiesPage() {
  const universities = useHigherEducationUniversities();
  const data = universities.data;
  const isLoading = universities.isLoading;
  const [showAdd, setShowAdd] = useState(false);

  const columns: DataTableColumn<UniversityRow>[] = [
    { key: "university", header: "University", width: "1.6fr", render: (row) => <span className="font-bold text-ink">{row.name}</span> },
    { key: "country", header: "Country", width: "0.9fr", render: (row) => <span className="text-body">{row.country}</span> },
    { key: "programmes", header: "Programmes", width: "1.3fr", render: (row) => <span className="text-body">{row.programmes ?? "—"}</span> },
    { key: "applied", header: "Applied", align: "right", render: (row) => <span className="font-mono text-body">{row.applied}</span> },
    { key: "admits", header: "Admits", align: "right", render: (row) => <span className="font-mono text-ink">{row.admits}</span> },
    { key: "funded", header: "Funded", align: "right", render: (row) => <span className="font-mono text-body">{row.funded}</span> },
    { key: "relation", header: "Relation", align: "right", render: (row) => <Badge tone="accent">{RELATION_LABEL[row.relation]}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Universities & partners</h1>
          <p className="mt-1 text-[13px] text-muted">
            {isLoading ? "—" : data?.summary.universitiesInPlay ?? 0} universities in play across {isLoading ? "—" : data?.summary.countriesInPlay ?? 0} countries · admit
            history, funding record and cell contacts
          </p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)}>
          Add university
        </Button>
      </div>

      {showAdd && <AddUniversityModal onClose={() => setShowAdd(false)} />}

      <Card className={`overflow-hidden p-0 ${HOVERABLE}`}>
        <DataTable
          columns={columns}
          data={data?.universities ?? []}
          rowKey={(row) => row.id}
          emptyMessage={isLoading ? "Loading…" : "No universities recorded yet."}
          hoverableRows
        />
      </Card>
    </div>
  );
}
