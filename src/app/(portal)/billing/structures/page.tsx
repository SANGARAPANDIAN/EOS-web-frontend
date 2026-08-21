"use client";

// Real-data pass of the `isStructures` sc-if block from
// "Billing Module - Web/Billing Admin.dc.html" (lines 1154-1313).
//
// GAP vs the design (see fees.ts's own comment for the full audit): a real
// fee_structure has only {name, applies_to: quota|hostel|transport,
// quota_id, academic_year} plus an array of items — no per-item "study
// year" tag and no hostel gender/occupancy/block/mess fields exist
// anywhere in the schema, so those design filters/columns are dropped
// here rather than wired to fields that don't exist. "Education" below
// means applies_to="quota" (tuition/exam/etc. demand-category items, the
// same term the backend's own DTO comments use); "Bus" browses the real
// transport_routes/transport_stages catalog (Billing was just given
// read-only access to it) the same way the design's route/stops view did.

import { useEffect, useMemo, useState } from "react";
import { PageHeader, filterBarSx, inputSx, clearBtnSx } from "@/modules/billing/PageHeader";
import { BillingModal, fieldLabelSx, fieldInputSx, fieldMonoSx, fieldRow2Sx } from "@/modules/billing/BillingModal";
import { money } from "@/modules/billing/fakeData";
import {
  useFeeStructures,
  useDemandCategories,
  useHostelRoomTypes,
  useTransportRoutes,
  useTransportStages,
  useQuotas,
  useCreateFeeStructure,
  useUpdateFeeStructure,
  useDeleteFeeStructure,
  type FeeStructureAppliesTo,
  type FeeStructureRow,
} from "@/modules/billing/api/fees";

const SECTION_TABS: { key: FeeStructureAppliesTo; label: string }[] = [
  { key: "quota", label: "Education" },
  { key: "hostel", label: "Hostel" },
  { key: "transport", label: "Bus" },
];

function tabSx(active: boolean) {
  return {
    background: active ? "#1d4ed8" : "#fff",
    color: active ? "#fff" : "#334155",
    border: active ? "1px solid #1d4ed8" : "1px solid #dfe4ec",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}

const cardSx = { background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, overflow: "auto" as const, marginBottom: 18 };
const cardHeadSx = { display: "flex", alignItems: "baseline" as const, gap: 12, padding: "18px 20px 14px" };
const cardTitleSx = { fontSize: 16.5, fontWeight: 800 };
const cardSubSx = { fontSize: 13, color: "#64748b" };
const countPillSx = { marginLeft: "auto", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#64748b", background: "#f1f5f9", borderRadius: 20, padding: "4px 11px" };
const tableSx = { width: "100%", borderCollapse: "collapse" as const };
const theadRowSx = { background: "#fff", borderBottom: "1px solid #eef1f6" };
const thLeftSx = { textAlign: "left" as const, padding: "14px 20px", fontSize: 12, fontWeight: 700, color: "#64748b" };
const thMidSx = { textAlign: "left" as const, padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" };
const thRightSx = { textAlign: "right" as const, padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" };
const thActionsSx = { textAlign: "right" as const, padding: "14px 18px", fontSize: 12, fontWeight: 700, color: "#64748b" };
const trSx = { borderTop: "1px solid #f1f5f9", transition: "transform .15s ease,box-shadow .15s ease", position: "relative" as const };
const tdNameSx = { padding: "13px 20px" };
const tdRightMonoSx = { padding: "13px 10px", textAlign: "right" as const, fontFamily: "'IBM Plex Mono',monospace", fontSize: 13.5, fontWeight: 600 };
const tdActionsSx = { padding: "13px 18px", textAlign: "right" as const };
const delBtnSx = { background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f2d6b" };

export default function FeeStructuresPage() {
  const { data: structures } = useFeeStructures();
  const { data: demandCategories } = useDemandCategories();
  const { data: hostelRoomTypes } = useHostelRoomTypes();
  const { data: transportRoutes } = useTransportRoutes();
  const { data: transportStages } = useTransportStages();
  const { data: quotas } = useQuotas();
  const createFeeStructure = useCreateFeeStructure();
  const updateFeeStructure = useUpdateFeeStructure();
  const deleteFeeStructure = useDeleteFeeStructure();

  const demandCategoryName = (id: number | null) => demandCategories?.find((c) => c.id === id)?.name ?? "—";
  const hostelRoomTypeName = (id: number | null) => hostelRoomTypes?.find((c) => c.id === id)?.name ?? "—";
  const transportStageName = (id: number | null) => transportStages?.find((c) => c.id === id)?.stage_name ?? "—";
  const quotaName = (id: number | null) => quotas?.find((q) => q.id === id)?.name ?? "None";

  const [q, setQ] = useState("");
  const [sectionFilter, setSectionFilter] = useState<FeeStructureAppliesTo>("quota");
  const [routeId, setRouteId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [editStructure, setEditStructure] = useState<FeeStructureRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroup, setEditGroup] = useState<FeeStructureAppliesTo>("quota");
  const [editQuota, setEditQuota] = useState<string>("None");
  const [editYear, setEditYear] = useState("");

  const [formName, setFormName] = useState("");
  const [formGroup, setFormGroup] = useState<FeeStructureAppliesTo>("quota");
  const [formQuota, setFormQuota] = useState<string>("None");
  const [formYear, setFormYear] = useState("");
  const [formDemandCategory, setFormDemandCategory] = useState<string>("");
  const [formHostelRoomType, setFormHostelRoomType] = useState<string>("");
  const [formTransportStage, setFormTransportStage] = useState<string>("");
  const [formAmount, setFormAmount] = useState("");

  const rows = useMemo(
    () => (structures ?? []).filter((s) => s.applies_to === sectionFilter && s.name.toLowerCase().includes(q.toLowerCase())),
    [structures, sectionFilter, q],
  );

  const routeRows = useMemo(
    () => (transportRoutes ?? []).filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [transportRoutes, q],
  );
  const pickedRoute = routeId != null ? transportRoutes?.find((r) => r.id === routeId) ?? null : null;
  const pickedRouteStages = useMemo(
    () => (transportStages ?? []).filter((st) => st.route_id === routeId).sort((a, b) => a.sequence_no - b.sequence_no),
    [transportStages, routeId],
  );

  useEffect(() => {
    // Auto-fill amount from the source's own fee for hostel/transport, no
    // auto-fill for demand-category (quota) — old-frontend-exact, matching
    // items/page.tsx's identical create-form behavior. Only while creating
    // (this page's edit form never touches item sources), and only when
    // the source selection actually changes — still editable afterward.
    if (formGroup === "hostel" && formHostelRoomType) {
      const rt = hostelRoomTypes?.find((r) => String(r.id) === formHostelRoomType);
      if (rt?.fee_amount != null) setFormAmount(String(rt.fee_amount));
    } else if (formGroup === "transport" && formTransportStage) {
      const st = transportStages?.find((s) => String(s.id) === formTransportStage);
      if (st?.fee_amount != null) setFormAmount(String(st.fee_amount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formHostelRoomType, formTransportStage, formGroup]);

  function totalAmount(items: { amount: string }[]) {
    return items.reduce((sum, it) => sum + Number(it.amount), 0);
  }

  function openModal() {
    setFormName("");
    setFormGroup(sectionFilter);
    setFormQuota("None");
    setFormYear("");
    setFormDemandCategory("");
    setFormHostelRoomType("");
    setFormTransportStage("");
    setFormAmount("");
    setModalOpen(true);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function openEdit(s: FeeStructureRow) {
    setEditStructure(s);
    setEditName(s.name);
    setEditGroup(s.applies_to);
    setEditQuota(quotaName(s.quota_id));
    setEditYear(s.academic_year);
  }

  function submitEdit() {
    if (!editStructure || !editName.trim() || !editYear.trim()) {
      showToast("Please fill in name and academic year");
      return;
    }
    const quotaId = quotas?.find((qz) => qz.name === editQuota)?.id;
    updateFeeStructure.mutate(
      { id: editStructure.id, input: { name: editName.trim(), applies_to: editGroup, quota_id: quotaId, academic_year: editYear.trim() } },
      {
        onSuccess: () => {
          setEditStructure(null);
          showToast("Fee structure updated");
        },
        onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not update this fee structure"),
      },
    );
  }

  function submitModal() {
    const amount = Number(formAmount);
    if (!formName.trim() || !formYear.trim() || !amount) {
      showToast("Please fill in name, academic year and amount");
      return;
    }
    const item =
      formGroup === "hostel"
        ? { hostel_room_type_id: Number(formHostelRoomType), amount }
        : formGroup === "transport"
          ? { transport_stage_id: Number(formTransportStage), amount }
          : { demand_category_id: Number(formDemandCategory), amount };
    if ((formGroup === "hostel" && !formHostelRoomType) || (formGroup === "transport" && !formTransportStage) || (formGroup === "quota" && !formDemandCategory)) {
      showToast("Please choose an item source");
      return;
    }
    const quotaId = quotas?.find((qz) => qz.name === formQuota)?.id;
    createFeeStructure.mutate(
      { name: formName.trim(), applies_to: formGroup, quota_id: quotaId, academic_year: formYear.trim(), items: [item] },
      {
        onSuccess: () => {
          setModalOpen(false);
          showToast("Fee structure added");
        },
        onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not add this fee structure"),
      },
    );
  }

  return (
    <div>
      <PageHeader title="Fee Structures" sub="Manage fee structures and the items inside them" actionLabel="Add fee structure" onAction={openModal} />

      {toast && (
        <div style={{ background: "#eef3ff", border: "1px solid #dbe4ff", color: "#1d4ed8", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
          {toast}
        </div>
      )}

      <div style={filterBarSx}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fee structure name"
          style={inputSx}
        />
        <button onClick={() => setQ("")} style={clearBtnSx}>Clear</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 16 }}>
        {SECTION_TABS.map((g) => (
          <button
            key={g.key}
            data-bill-tab
            onClick={() => {
              setSectionFilter(g.key);
              setRouteId(null);
            }}
            style={tabSx(sectionFilter === g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {sectionFilter === "quota" && (
        <div style={cardSx}>
          <div style={cardHeadSx}>
            <div style={cardTitleSx}>Education Fees</div>
            <div style={cardSubSx}>Tuition and academic charges</div>
            <span style={countPillSx}>{rows.length} structures</span>
          </div>
          <table style={tableSx}>
            <thead>
              <tr style={theadRowSx}>
                <th style={thLeftSx}>NAME</th>
                <th style={thMidSx}>QUOTA</th>
                <th style={thMidSx}>ITEMS</th>
                <th style={thRightSx}>TOTAL AMOUNT</th>
                <th style={thMidSx}>ACADEMIC YEAR</th>
                <th style={thActionsSx}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} data-bill-rowtable style={trSx}>
                  <td style={tdNameSx}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#94a3b8" }}>ID {s.id}</div>
                  </td>
                  <td style={{ padding: "13px 10px", fontSize: 13, color: "#475569" }}>{quotaName(s.quota_id)}</td>
                  <td style={{ padding: "13px 10px", fontSize: 13, color: "#64748b" }}>
                    {s.fee_structure_items.map((it) => demandCategoryName(it.demand_category_id)).join(", ") || "—"}
                  </td>
                  <td style={tdRightMonoSx}>{money(totalAmount(s.fee_structure_items))}</td>
                  <td style={{ padding: "13px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }}>{s.academic_year}</td>
                  <td style={tdActionsSx}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button data-bill-icon onClick={() => openEdit(s)} style={delBtnSx}>Edit</button>
                      <button
                        data-bill-icon
                        onClick={() =>
                          deleteFeeStructure.mutate(s.id, {
                            onSuccess: () => showToast(`${s.name} deleted`),
                            onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not delete this fee structure"),
                          })
                        }
                        style={delBtnSx}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 22, textAlign: "center", fontSize: 12.5, color: "#94a3b8" }}>No education fee structures yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {sectionFilter === "hostel" && (
        <div style={cardSx}>
          <div style={cardHeadSx}>
            <div style={cardTitleSx}>Hostel Fees</div>
            <div style={cardSubSx}>Room charges by room type</div>
            <span style={countPillSx}>{rows.length} structures</span>
          </div>
          <table style={tableSx}>
            <thead>
              <tr style={theadRowSx}>
                <th style={thLeftSx}>NAME</th>
                <th style={thMidSx}>ROOM TYPES</th>
                <th style={thRightSx}>TOTAL AMOUNT</th>
                <th style={thMidSx}>ACADEMIC YEAR</th>
                <th style={thActionsSx}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} data-bill-rowtable style={trSx}>
                  <td style={tdNameSx}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#94a3b8" }}>ID {r.id}</div>
                  </td>
                  <td style={{ padding: "13px 10px", fontSize: 13, color: "#475569" }}>
                    {r.fee_structure_items.map((it) => hostelRoomTypeName(it.hostel_room_type_id)).join(", ") || "—"}
                  </td>
                  <td style={tdRightMonoSx}>{money(totalAmount(r.fee_structure_items))}</td>
                  <td style={{ padding: "13px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }}>{r.academic_year}</td>
                  <td style={tdActionsSx}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button data-bill-icon onClick={() => openEdit(r)} style={delBtnSx}>Edit</button>
                      <button
                        data-bill-icon
                        onClick={() =>
                          deleteFeeStructure.mutate(r.id, {
                            onSuccess: () => showToast(`${r.name} deleted`),
                            onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not delete this fee structure"),
                          })
                        }
                        style={delBtnSx}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 22, textAlign: "center", fontSize: 12.5, color: "#94a3b8" }}>No hostel fee structures yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {sectionFilter === "transport" && !pickedRoute && (
        <>
          <div style={cardSx}>
            <div style={cardHeadSx}>
              <div style={cardTitleSx}>Bus Fee Structures</div>
              <div style={cardSubSx}>Transport-fee structures and their stage items</div>
              <span style={countPillSx}>{rows.length} structures</span>
            </div>
            <table style={tableSx}>
              <thead>
                <tr style={theadRowSx}>
                  <th style={thLeftSx}>NAME</th>
                  <th style={thMidSx}>STAGES</th>
                  <th style={thRightSx}>TOTAL AMOUNT</th>
                  <th style={thMidSx}>ACADEMIC YEAR</th>
                  <th style={thActionsSx}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} data-bill-rowtable style={trSx}>
                    <td style={tdNameSx}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#94a3b8" }}>ID {s.id}</div>
                    </td>
                    <td style={{ padding: "13px 10px", fontSize: 13, color: "#475569" }}>
                      {s.fee_structure_items.map((it) => transportStageName(it.transport_stage_id)).join(", ") || "—"}
                    </td>
                    <td style={tdRightMonoSx}>{money(totalAmount(s.fee_structure_items))}</td>
                    <td style={{ padding: "13px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }}>{s.academic_year}</td>
                    <td style={tdActionsSx}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button data-bill-icon onClick={() => openEdit(s)} style={delBtnSx}>Edit</button>
                        <button
                          data-bill-icon
                          onClick={() =>
                            deleteFeeStructure.mutate(s.id, {
                              onSuccess: () => showToast(`${s.name} deleted`),
                              onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not delete this fee structure"),
                            })
                          }
                          style={delBtnSx}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 22, textAlign: "center", fontSize: 12.5, color: "#94a3b8" }}>No bus fee structures yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={cardSx}>
            <div style={cardHeadSx}>
              <div style={cardTitleSx}>Bus Routes</div>
              <div style={cardSubSx}>Open a route to see stop-wise fares from college</div>
              <span style={countPillSx}>{routeRows.length} routes</span>
            </div>
            <table style={tableSx}>
              <thead>
                <tr style={theadRowSx}>
                  <th style={thLeftSx}>ROUTE</th>
                  <th style={thMidSx}>BOARDING AREA</th>
                  <th style={thMidSx}>DISTANCE</th>
                  <th style={thActionsSx}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {routeRows.map((t) => (
                  <tr key={t.id} data-bill-rowtable onClick={() => setRouteId(t.id)} style={{ ...trSx, cursor: "pointer" }}>
                    <td style={{ padding: "13px 20px", fontSize: 13.5, fontWeight: 700 }}>{t.name}</td>
                    <td style={thMidSx}>{t.boarding_area ?? "—"}</td>
                    <td style={{ padding: "13px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: "#475569" }}>{t.distance_km ? `${t.distance_km} km` : "—"}</td>
                    <td style={tdActionsSx}>
                      <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
                        View stops
                      </span>
                    </td>
                  </tr>
                ))}
                {routeRows.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 22, textAlign: "center", fontSize: 12.5, color: "#94a3b8" }}>No bus routes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sectionFilter === "transport" && pickedRoute && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <button
              data-bill-tab
              onClick={() => setRouteId(null)}
              style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap" as const }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M15 19l-7-7 7-7" />
              </svg>
              All routes
            </button>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.015em" }}>{pickedRoute.name}</div>
              <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                {pickedRoute.boarding_area ?? "—"} {pickedRoute.distance_km ? `· ${pickedRoute.distance_km} km` : ""}
              </div>
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, overflow: "auto" }}>
            <table style={tableSx}>
              <thead>
                <tr style={theadRowSx}>
                  <th style={thLeftSx}>STOP</th>
                  <th style={thMidSx}>STAGE NAME</th>
                  <th style={thRightSx}>ANNUAL FARE</th>
                </tr>
              </thead>
              <tbody>
                {pickedRouteStages.map((s) => (
                  <tr key={s.id} data-bill-rowtable style={trSx}>
                    <td style={{ padding: "13px 20px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: "#64748b" }}>Stop {s.sequence_no}</td>
                    <td style={{ padding: "13px 10px", fontSize: 13.5, fontWeight: 700 }}>{s.stage_name}</td>
                    <td style={{ padding: "13px 20px", textAlign: "right" as const, fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 600 }}>{money(Number(s.fee_amount))}</td>
                  </tr>
                ))}
                {pickedRouteStages.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: 22, textAlign: "center", fontSize: 12.5, color: "#94a3b8" }}>No stages recorded for this route.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BillingModal
        open={modalOpen}
        title="Add Fee Structure"
        sub="Create a new fee structure with its first item"
        cta="Add structure"
        onClose={() => setModalOpen(false)}
        onSubmit={submitModal}
      >
        <div>
          <div style={fieldLabelSx}>Name</div>
          <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. AI&DS - 2026" style={fieldInputSx} />
        </div>
        <div style={fieldRow2Sx}>
          <div>
            <div style={fieldLabelSx}>Section</div>
            <select value={formGroup} onChange={(e) => setFormGroup(e.target.value as FeeStructureAppliesTo)} style={{ ...fieldInputSx, background: "#fff" }}>
              <option value="quota">Education Fees</option>
              <option value="hostel">Hostel Fees</option>
              <option value="transport">Bus Fees</option>
            </select>
          </div>
          <div>
            <div style={fieldLabelSx}>Quota</div>
            <select value={formQuota} onChange={(e) => setFormQuota(e.target.value)} style={{ ...fieldInputSx, background: "#fff" }}>
              <option value="None">None</option>
              {(quotas ?? []).map((q2) => (
                <option key={q2.id} value={q2.name}>{q2.name}</option>
              ))}
            </select>
          </div>
        </div>

        {formGroup === "quota" && (
          <div>
            <div style={fieldLabelSx}>Demand Category</div>
            <select value={formDemandCategory} onChange={(e) => setFormDemandCategory(e.target.value)} style={{ ...fieldInputSx, background: "#fff" }}>
              <option value="">Select a demand category</option>
              {(demandCategories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {formGroup === "hostel" && (
          <div>
            <div style={fieldLabelSx}>Room Type</div>
            <select value={formHostelRoomType} onChange={(e) => setFormHostelRoomType(e.target.value)} style={{ ...fieldInputSx, background: "#fff" }}>
              <option value="">Select a room type</option>
              {(hostelRoomTypes ?? []).map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>
        )}

        {formGroup === "transport" && (
          <div>
            <div style={fieldLabelSx}>Transport Stage</div>
            <select value={formTransportStage} onChange={(e) => setFormTransportStage(e.target.value)} style={{ ...fieldInputSx, background: "#fff" }}>
              <option value="">Select a stage</option>
              {(transportStages ?? []).map((st) => (
                <option key={st.id} value={st.id}>{st.stage_name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={fieldRow2Sx}>
          <div>
            <div style={fieldLabelSx}>Academic Year</div>
            <input value={formYear} onChange={(e) => setFormYear(e.target.value)} placeholder="2026-27" style={fieldMonoSx} />
          </div>
          <div>
            <div style={fieldLabelSx}>Amount</div>
            <input value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="e.g. 60000" style={fieldMonoSx} />
          </div>
        </div>
      </BillingModal>

      {/* Edit is a separate, simpler flow than Create (old-frontend-exact):
          just {name, applies_to, quota_id, academic_year} — no items. */}
      <BillingModal
        open={editStructure !== null}
        title="Edit Fee Structure"
        sub="Update this fee structure's name, section, quota or academic year"
        cta="Save Changes"
        onClose={() => setEditStructure(null)}
        onSubmit={submitEdit}
      >
        <div>
          <div style={fieldLabelSx}>Name</div>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} style={fieldInputSx} />
        </div>
        <div style={fieldRow2Sx}>
          <div>
            <div style={fieldLabelSx}>Section</div>
            <select value={editGroup} onChange={(e) => setEditGroup(e.target.value as FeeStructureAppliesTo)} style={{ ...fieldInputSx, background: "#fff" }}>
              <option value="quota">Education Fees</option>
              <option value="hostel">Hostel Fees</option>
              <option value="transport">Bus Fees</option>
            </select>
          </div>
          <div>
            <div style={fieldLabelSx}>Quota</div>
            <select value={editQuota} onChange={(e) => setEditQuota(e.target.value)} style={{ ...fieldInputSx, background: "#fff" }}>
              <option value="None">None</option>
              {(quotas ?? []).map((q2) => (
                <option key={q2.id} value={q2.name}>{q2.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <div style={fieldLabelSx}>Academic Year</div>
          <input value={editYear} onChange={(e) => setEditYear(e.target.value)} placeholder="2026-27" style={fieldMonoSx} />
        </div>
      </BillingModal>
    </div>
  );
}
