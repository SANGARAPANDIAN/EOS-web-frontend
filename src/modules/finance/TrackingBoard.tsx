"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useOrderTracking,
  useStartTracking,
  useUpdateTracking,
  useDeleteAllotment,
  money,
  moneyCompact,
  formatDate,
  formatDateTime,
  type DeliveryStatus,
  type OrderKind,
  type OrderTracking,
  type Allotment,
} from "./api/finance";
import {
  BLUE,
  GREY,
  cardSx,
  monoSx,
  panelTitleSx,
  filterBarSx,
  inputSx,
  selectSx,
  clearBtnSx,
  primaryBtnSx,
  softBtnSx,
  PageHead,
  SegmentedSwitch,
  StatCard,
  Chip,
  Empty,
  Meter,
} from "./ui";
import { FinanceModal, fieldLabelSx, fieldInputSx, fieldMonoSx, fieldRow2Sx } from "./FinanceModal";
import { StageTracker, StageHistory, stagesFor, stageLabel, CountPill } from "./TrackingTimeline";
import { AllotmentDialog, AllotmentChips } from "./AllotmentDialog";

export type FinanceOrderView = "tracking" | "history";

// Shared by POP/SOP tracking and by both History screens.
//
// `historyMode` renders the completed record: same data, but read-only for the
// order itself and with no allotment editing — history is a record, not a
// workspace, so only the live tracking screens can change anything.

export function TrackingBoard({
  kind,
  title,
  sub,
  entityLabel,
  initialView = "tracking",
}: {
  kind: OrderKind;
  title: string;
  sub: string;
  entityLabel: string;
  /** Which pane opens first; the switch below changes it thereafter. */
  initialView?: FinanceOrderView;
}) {
  // Tracking and History are two views of the same orders, so they live on one
  // page behind a switch rather than as two sidebar destinations. The choice is
  // mirrored into the URL (?view=history) so a particular view stays
  // shareable and survives a refresh.
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view");
  const [view, setView] = useState<FinanceOrderView>(
    urlView === "history" || urlView === "tracking" ? urlView : initialView,
  );
  const historyMode = view === "history";

  function switchView(next: FinanceOrderView) {
    setView(next);
    setExpanded(null);
    setStatusFilter("");
    const qs = new URLSearchParams(searchParams.toString());
    if (next === "tracking") qs.delete("view");
    else qs.set("view", next);
    const query = qs.toString();
    router.replace(query ? `?${query}` : "?", { scroll: false });
  }

  const { data: orders, isLoading } = useOrderTracking(kind);
  const startTracking = useStartTracking();
  const updateTracking = useUpdateTracking();
  const deleteAllotment = useDeleteAllotment();

  const stages = stagesFor(kind);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [startModal, setStartModal] = useState<OrderTracking | null>(null);
  const [qtyOrdered, setQtyOrdered] = useState("");
  const [expected, setExpected] = useState("");
  const [reference, setReference] = useState("");
  const [startRemarks, setStartRemarks] = useState("");

  const [stageModal, setStageModal] = useState<OrderTracking | null>(null);
  const [nextStatus, setNextStatus] = useState<DeliveryStatus>("dispatched");
  const [qtyDelivered, setQtyDelivered] = useState("");
  const [stageRemarks, setStageRemarks] = useState("");

  const [allotFor, setAllotFor] = useState<OrderTracking | null>(null);
  const [editingAllotment, setEditingAllotment] = useState<Allotment | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  const rows = useMemo(() => {
    let list = orders ?? [];
    list = historyMode
      ? list.filter((o) => o.delivery_status === "delivered" || o.delivery_status === "cancelled")
      : list.filter((o) => o.delivery_status !== "delivered" && o.delivery_status !== "cancelled");
    if (statusFilter) list = list.filter((o) => o.delivery_status === statusFilter);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(n) ||
          o.order_number.toLowerCase().includes(n) ||
          (o.vendor ?? "").toLowerCase().includes(n) ||
          (o.department ?? "").toLowerCase().includes(n) ||
          (o.tracking_reference ?? "").toLowerCase().includes(n) ||
          o.allotments.some((a) => a.faculty_name.toLowerCase().includes(n)),
      );
    }
    return list;
  }, [orders, historyMode, statusFilter, q]);

  const counts = useMemo(() => {
    const list = orders ?? [];
    return {
      total: list.length,
      untracked: list.filter((o) => o.id === 0).length,
      inFlight: list.filter((o) => o.id !== 0 && ["ordered", "dispatched", "in_transit"].includes(o.delivery_status)).length,
      done: list.filter((o) => o.delivery_status === "delivered").length,
      pendingAllot: list.filter((o) => o.quantity_delivered > 0 && o.quantity_allotted < o.quantity_delivered).length,
      value: list.reduce((s, o) => s + (o.approved_amount ?? 0), 0),
      // Split for the switch badges: History holds the finished record, and
      // Tracking everything still moving.
      closed: list.filter((o) => o.delivery_status === "delivered" || o.delivery_status === "cancelled").length,
      open: list.filter((o) => o.delivery_status !== "delivered" && o.delivery_status !== "cancelled").length,
    };
  }, [orders]);

  function openStart(o: OrderTracking) {
    setQtyOrdered(o.quantity_ordered ? String(o.quantity_ordered) : "");
    setExpected("");
    setReference("");
    setStartRemarks("");
    setErr(null);
    setStartModal(o);
  }

  function submitStart() {
    if (!startModal) return;
    setErr(null);
    startTracking.mutate(
      {
        order_kind: kind,
        order_id: startModal.order_id,
        quantity_ordered: qtyOrdered ? Number(qtyOrdered) : undefined,
        expected_delivery_date: expected || undefined,
        tracking_reference: reference.trim() || undefined,
        remarks: startRemarks.trim() || undefined,
      },
      {
        onSuccess: () => { setStartModal(null); showToast(`Tracking started for ${startModal.order_number}`); },
        onError: (e) => setErr(e instanceof Error ? e.message : "Could not start tracking"),
      },
    );
  }

  function openStage(o: OrderTracking) {
    const idx = stages.findIndex((s) => s.status === o.delivery_status);
    setNextStatus(idx >= 0 && idx < stages.length - 1 ? stages[idx + 1].status : "delivered");
    setQtyDelivered(
      o.quantity_delivered ? String(o.quantity_delivered) : o.quantity_ordered ? String(o.quantity_ordered) : "",
    );
    setStageRemarks("");
    setErr(null);
    setStageModal(o);
  }

  function submitStage() {
    if (!stageModal) return;
    setErr(null);
    const needsQty = nextStatus === "delivered" || nextStatus === "partially_delivered";
    updateTracking.mutate(
      {
        id: stageModal.id,
        input: {
          delivery_status: nextStatus,
          quantity_delivered: needsQty && qtyDelivered ? Number(qtyDelivered) : undefined,
          remarks: stageRemarks.trim() || undefined,
        },
      },
      {
        onSuccess: () => { setStageModal(null); showToast(`${stageModal.order_number} · ${stageLabel(kind, nextStatus)}`); },
        onError: (e) => setErr(e instanceof Error ? e.message : "Could not update the stage"),
      },
    );
  }

  function removeAllotment(a: Allotment) {
    deleteAllotment.mutate(a.id, {
      onSuccess: () => showToast(`Allotment to ${a.faculty_name} removed`),
      onError: (e) => showToast(e instanceof Error ? e.message : "Could not remove that allotment"),
    });
  }

  const selectableStatuses: DeliveryStatus[] = [
    ...stages.map((s) => s.status),
    "partially_delivered",
    "cancelled",
  ];

  return (
    <div>
      <PageHead
        title={historyMode ? `${entityLabel === "purchase" ? "POP" : "SOP"} History` : title}
        sub={
          historyMode
            ? `Completed ${entityLabel} orders with their amounts, delivery record and faculty allotments`
            : sub
        }
        right={
          <SegmentedSwitch
            value={view}
            onChange={switchView}
            options={[
              { value: "tracking", label: "Tracking" },
              { value: "history", label: "History" },
            ]}
          />
        }
      />

      {!historyMode && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 22 }}>
          <StatCard label="Orders in view" value={String(counts.total)} icon="archive" hi={String(counts.untracked)} sub="not tracked yet" pct={counts.total > 0 ? ((counts.total - counts.untracked) / counts.total) * 100 : 0} foot={`${moneyCompact(counts.value)} approved value`} delay={0} />
          <StatCard label="In flight" value={String(counts.inFlight)} icon="truck" hi={String(counts.total)} sub="tracked orders" pct={counts.total > 0 ? (counts.inFlight / counts.total) * 100 : 0} foot={`${stages[1].label} or ${stages[2].label}`} delay={55} />
          <StatCard label={stages[stages.length - 1].label} value={String(counts.done)} icon="approve" hi={String(counts.total)} sub="orders total" pct={counts.total > 0 ? (counts.done / counts.total) * 100 : 0} foot="Reached the final stage" delay={110} />
          <StatCard label="Awaiting allotment" value={String(counts.pendingAllot)} icon="faculty" hi={String(counts.done)} sub={stages[stages.length - 1].label.toLowerCase()} pct={counts.done > 0 ? (counts.pendingAllot / counts.done) * 100 : 0} foot="Not yet handed to faculty" delay={165} />
        </div>
      )}

      <div style={{ ...filterBarSx, marginTop: historyMode ? 0 : 22 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order number, item, vendor, department or faculty…" style={inputSx} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectSx}>
          <option value="">All stages</option>
          {(historyMode ? (["delivered", "cancelled"] as DeliveryStatus[]) : selectableStatuses.filter((s) => s !== "delivered" && s !== "cancelled")).map((s) => (
            <option key={s} value={s}>{stageLabel(kind, s)}</option>
          ))}
        </select>
        {(q || statusFilter) && (
          <button onClick={() => { setQ(""); setStatusFilter(""); }} style={clearBtnSx}>Clear</button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 70, textAlign: "center", fontSize: 13.1, color: GREY.faint }}>Loading orders…</div>
      ) : rows.length === 0 ? (
        <div style={cardSx}>
          <Empty
            title={historyMode ? "No completed records yet" : `No ${entityLabel} orders in progress`}
            hint={
              historyMode
                ? `Orders appear here once they reach ${stages[stages.length - 1].label.toLowerCase()} or are cancelled.`
                : "Orders show up here once a proposal is approved and an order is placed."
            }
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((o, i) => {
            const open = expanded === o.order_id;
            const notTracked = o.id === 0;
            const isDone = o.delivery_status === "delivered" || o.delivery_status === "partially_delivered";
            const canAllot = isDone && o.quantity_delivered > o.quantity_allotted;

            return (
              <div key={o.order_id} data-fin-lift="" className="fin-rise" style={{ ...cardSx, padding: 0, overflow: "hidden", animationDelay: `${Math.min(i * 40, 240)}ms` }}>
                {/* Header strip: identity, value, actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <span style={{ ...monoSx, fontSize: 11.6, fontWeight: 700, color: BLUE.strong, background: BLUE.soft, borderRadius: 6, padding: "3px 9px" }}>
                        {o.order_number}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: BLUE.ink }}>{o.title}</span>
                      {notTracked ? (
                        <Chip variant="quiet">Not tracked</Chip>
                      ) : (
                        <Chip variant={o.delivery_status === "cancelled" ? "quiet" : isDone ? "soft" : "solid"}>
                          {stageLabel(kind, o.delivery_status)}
                        </Chip>
                      )}
                    </div>
                    <div style={{ fontSize: 11.6, color: GREY.muted, marginTop: 4 }}>
                      {o.department ?? "—"} · {o.vendor ?? "no vendor"} · placed {formatDate(o.order_placed_at)}
                      {o.tracking_reference ? ` · ref ${o.tracking_reference}` : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 22, flex: "0 0 auto" }}>
                    <CountPill label="VALUE" value={money(o.approved_amount)} />
                    {o.quantity_ordered !== null && (
                      <CountPill label="QTY" value={`${o.quantity_delivered}/${o.quantity_ordered}`} />
                    )}
                    <CountPill label="ALLOTTED" value={String(o.quantity_allotted)} />
                  </div>

                  <div style={{ display: "flex", gap: 7, flex: "0 0 auto" }}>
                    <button data-fin-soft="" onClick={() => setExpanded(open ? null : o.order_id)} style={softBtnSx}>
                      {open ? "Hide" : "Details"}
                    </button>
                    {!historyMode && notTracked && (
                      <button onClick={() => openStart(o)} style={primaryBtnSx}>Start tracking</button>
                    )}
                    {!historyMode && !notTracked && o.delivery_status !== "cancelled" && (
                      <button onClick={() => openStage(o)} style={primaryBtnSx}>Update stage</button>
                    )}
                    {!historyMode && canAllot && (
                      <button onClick={() => { setEditingAllotment(null); setAllotFor(o); }} style={{ ...softBtnSx, borderColor: BLUE.primary, color: BLUE.primary }}>
                        Allot
                      </button>
                    )}
                  </div>
                </div>

                {/* Stage rail */}
                {!notTracked && (
                  <div style={{ padding: "4px 20px 18px", borderTop: `1px solid ${GREY.rule}` }}>
                    <div style={{ paddingTop: 16 }}>
                      <StageTracker kind={kind} status={o.delivery_status} />
                    </div>
                    {o.quantity_ordered !== null && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 18, marginTop: 18 }}>
                        <Meter value={o.quantity_delivered} total={o.quantity_ordered} caption={stages[stages.length - 1].label} />
                        <Meter value={o.quantity_allotted} total={o.quantity_delivered || o.quantity_ordered} caption="Allotted to faculty" />
                        {o.expected_delivery_date && (
                          <div>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint, letterSpacing: 0.3 }}>EXPECTED</div>
                            <div style={{ fontSize: 12.2, fontWeight: 600, marginTop: 4 }}>{formatDate(o.expected_delivery_date)}</div>
                          </div>
                        )}
                        {o.delivered_at && (
                          <div>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint, letterSpacing: 0.3 }}>
                              {stages[stages.length - 1].label.toUpperCase()} ON
                            </div>
                            <div style={{ fontSize: 12.2, fontWeight: 600, marginTop: 4, color: BLUE.primary }}>
                              {formatDate(o.delivered_at)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {o.allotments.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint, marginBottom: 7, letterSpacing: 0.3 }}>
                          CUSTODY
                        </div>
                        {/* History is a record: no editing there. */}
                        <AllotmentChips
                          allotments={o.allotments}
                          onEdit={historyMode ? undefined : (a) => { setEditingAllotment(a); setAllotFor(o); }}
                          onRemove={historyMode ? undefined : removeAllotment}
                        />
                      </div>
                    )}
                  </div>
                )}

                {open && (
                  <div className="fin-rise" style={{ background: BLUE.wash, borderTop: `1px solid ${GREY.border}`, padding: "18px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 26 }}>
                      <div>
                        <h3 style={{ ...panelTitleSx, fontSize: 13.1, marginBottom: 12 }}>Order</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(136px,1fr))", gap: 14 }}>
                          {[
                            { label: "Requested by", value: o.requested_by ?? "—" },
                            { label: "Proposal", value: `#${o.proposal_id}` },
                            { label: "Qty ordered", value: o.quantity_ordered !== null ? String(o.quantity_ordered) : "—" },
                            { label: stages[stages.length - 1].label, value: String(o.quantity_delivered) },
                            { label: "Allotted", value: String(o.quantity_allotted) },
                          ].map((f) => (
                            <div key={f.label}>
                              <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint, letterSpacing: 0.3 }}>
                                {f.label.toUpperCase()}
                              </div>
                              <div style={{ fontSize: 12.2, marginTop: 3, fontWeight: 600, color: BLUE.ink }}>{f.value}</div>
                            </div>
                          ))}
                        </div>
                        {o.description && (
                          <div style={{ marginTop: 15 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint, letterSpacing: 0.3 }}>DESCRIPTION</div>
                            <div style={{ fontSize: 12.2, marginTop: 3, color: GREY.text, lineHeight: 1.6 }}>{o.description}</div>
                          </div>
                        )}
                        {o.allotments.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <h3 style={{ ...panelTitleSx, fontSize: 13.1, marginBottom: 8 }}>Allotment record</h3>
                            {o.allotments.map((a) => (
                              <div key={a.id} style={{ borderTop: `1px solid ${GREY.rule}`, padding: "9px 0" }}>
                                <div style={{ fontSize: 12.2, fontWeight: 600, color: BLUE.ink }}>
                                  {a.faculty_name} <span style={{ ...monoSx, color: BLUE.primary }}>×{a.quantity}</span>
                                </div>
                                <div style={{ fontSize: 11.3, color: GREY.muted, marginTop: 2 }}>
                                  {a.faculty_designation ?? "—"}
                                  {a.faculty_department ? ` · ${a.faculty_department}` : ""}
                                </div>
                                <div style={{ fontSize: 10.8, color: GREY.faint, marginTop: 2 }}>
                                  {formatDateTime(a.allotted_at)}
                                  {a.allotted_by ? ` · by ${a.allotted_by}` : ""}
                                </div>
                                {a.remarks && (
                                  <div style={{ fontSize: 11.6, color: GREY.text, marginTop: 3 }}>{a.remarks}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 style={{ ...panelTitleSx, fontSize: 13.1, marginBottom: 12 }}>Stage history</h3>
                        <StageHistory kind={kind} events={o.events} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Start tracking */}
      <FinanceModal
        open={startModal !== null}
        title={`Start tracking ${startModal?.order_number ?? ""}`}
        sub="Record what was ordered so progress and allotment can be tracked against it."
        cta="Start tracking"
        busy={startTracking.isPending}
        onClose={() => setStartModal(null)}
        onSubmit={submitStart}
      >
        {err && (
          <div style={{ background: BLUE.soft, border: `1px solid ${BLUE.line}`, borderRadius: 9, padding: "10px 13px", fontSize: 12.2, color: BLUE.strong, fontWeight: 600 }}>{err}</div>
        )}
        <div style={fieldRow2Sx}>
          <div>
            <div style={fieldLabelSx}>Quantity ordered</div>
            <input value={qtyOrdered} onChange={(e) => setQtyOrdered(e.target.value)} placeholder="5" style={fieldMonoSx} />
          </div>
          <div>
            <div style={fieldLabelSx}>Expected by</div>
            <input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} style={fieldInputSx} />
          </div>
        </div>
        <div>
          <div style={fieldLabelSx}>Reference</div>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Vendor docket / ticket number" style={fieldInputSx} />
        </div>
        <div>
          <div style={fieldLabelSx}>Remarks</div>
          <input value={startRemarks} onChange={(e) => setStartRemarks(e.target.value)} placeholder="Any note for the record" style={fieldInputSx} />
        </div>
      </FinanceModal>

      {/* Update stage */}
      <FinanceModal
        open={stageModal !== null}
        title={`Update ${stageModal?.order_number ?? ""}`}
        sub="Stages are advanced manually — select the stage this order has actually reached."
        cta="Save stage"
        busy={updateTracking.isPending}
        onClose={() => setStageModal(null)}
        onSubmit={submitStage}
      >
        {err && (
          <div style={{ background: BLUE.soft, border: `1px solid ${BLUE.line}`, borderRadius: 9, padding: "10px 13px", fontSize: 12.2, color: BLUE.strong, fontWeight: 600 }}>{err}</div>
        )}
        <div style={{ background: "#fff", border: `1px solid ${GREY.border}`, borderRadius: 12, padding: "16px 18px" }}>
          <StageTracker kind={kind} status={nextStatus} />
        </div>
        <div>
          <div style={fieldLabelSx}>Stage</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selectableStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setNextStatus(s)}
                style={{
                  borderRadius: 9,
                  padding: "9px 14px",
                  fontSize: 12.2,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: nextStatus === s ? `1px solid ${BLUE.primary}` : `1px solid ${GREY.border}`,
                  background: nextStatus === s ? BLUE.soft : "#fff",
                  color: nextStatus === s ? BLUE.strong : GREY.text,
                }}
              >
                {stageLabel(kind, s)}
              </button>
            ))}
          </div>
        </div>
        {(nextStatus === "delivered" || nextStatus === "partially_delivered") && (
          <div>
            <div style={fieldLabelSx}>
              Quantity {stages[stages.length - 1].label.toLowerCase()} <span style={{ color: BLUE.primary }}>*</span>
            </div>
            <input value={qtyDelivered} onChange={(e) => setQtyDelivered(e.target.value)} placeholder="5" style={fieldMonoSx} />
            <div style={{ fontSize: 11.3, color: GREY.muted, marginTop: 5 }}>
              Allotment can never exceed this — the database enforces it.
            </div>
          </div>
        )}
        <div>
          <div style={fieldLabelSx}>Note for the history</div>
          <input value={stageRemarks} onChange={(e) => setStageRemarks(e.target.value)} placeholder="e.g. Received at central stores" style={fieldInputSx} />
        </div>
      </FinanceModal>

      <AllotmentDialog
        order={allotFor}
        editing={editingAllotment}
        onClose={() => { setAllotFor(null); setEditingAllotment(null); }}
        onDone={(msg) => { setAllotFor(null); setEditingAllotment(null); showToast(msg); }}
      />

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: BLUE.ink, color: "#fff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
