"use client";

import { useMemo, useState } from "react";
import {
  useProposals,
  useDecideProposal,
  useCurrentFund,
  useOrderTracking,
  useDeleteAllotment,
  money,
  moneyCompact,
  formatDate,
  type FinanceProposal,
  type ProposalKind,
  type OrderTracking,
  type Allotment,
  type FacultyOption,
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
  dangerBtnSx,
  PageHead,
  StatCard,
  Chip,
  Empty,
  Meter,
} from "./ui";
import { FinanceModal, fieldLabelSx, fieldInputSx, fieldMonoSx } from "./FinanceModal";
import { StageTracker, stageLabel } from "./TrackingTimeline";
import { AllotmentDialog, AllotmentChips } from "./AllotmentDialog";
import { FacultyPicker } from "./FacultyPicker";

// Shared by POP and SOP approval — one workflow over two entities.
//
// Faculty allotment lives here as well as on the tracking screens, because a
// decision-maker looking at an approved proposal wants to hand the item over
// without changing screens. It is the same dialog and the same rules: the
// database only permits allotment once the order is delivered, so the row
// shows its live delivery stage and the action is offered only when it is legal.

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  finance_approved: "Approved",
  hod_approved: "HoD approved",
  principal_approved: "Principal approved",
  rejected: "Rejected",
};

export function ApprovalQueue({
  kind,
  title,
  sub,
  entityLabel,
}: {
  kind: ProposalKind;
  title: string;
  sub: string;
  entityLabel: string;
}) {
  const [statusFilter, setStatusFilter] = useState("pending");
  // Fetch every proposal once and filter in the browser. Fetching per-status
  // made the tab look empty whenever nothing was pending — even with real
  // proposals sitting in other states — because the page had no way to know
  // they existed. Now the counts are always known, so the UI can say so.
  const { data: allProposals, isLoading } = useProposals(kind);
  const proposals = useMemo(
    () => (statusFilter ? (allProposals ?? []).filter((p) => p.status === statusFilter) : allProposals ?? []),
    [allProposals, statusFilter],
  );
  const { data: fund } = useCurrentFund();
  const orderKind = kind === "pop" ? "purchase" : "service";
  const { data: tracking } = useOrderTracking(orderKind);
  const decide = useDecideProposal(kind);
  const deleteAllotment = useDeleteAllotment();

  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [modal, setModal] = useState<null | { proposal: FinanceProposal; decision: "approve" | "reject" }>(null);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Faculty nominated during approval (who the order is for). Distinct from
  // allotment, which records actual custody once the order is delivered.
  const [assignFaculty, setAssignFaculty] = useState<FacultyOption | null>(null);
  const [assignNote, setAssignNote] = useState("");

  const [allotFor, setAllotFor] = useState<OrderTracking | null>(null);
  const [editingAllotment, setEditingAllotment] = useState<Allotment | null>(null);

  // Join proposals to their placed order's tracking row, so an approved
  // proposal can show delivery progress and offer allotment inline.
  const trackingByProposal = useMemo(() => {
    const map = new Map<number, OrderTracking>();
    for (const t of tracking ?? []) map.set(t.proposal_id, t);
    return map;
  }, [tracking]);

  const departments = useMemo(
    () => [...new Set((proposals ?? []).map((p) => p.department).filter((d): d is string => !!d))].sort(),
    [proposals],
  );

  const rows = useMemo(() => {
    let list = proposals ?? [];
    if (deptFilter) list = list.filter((p) => p.department === deptFilter);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(n) ||
          (p.reference ?? "").toLowerCase().includes(n) ||
          (p.vendor ?? "").toLowerCase().includes(n) ||
          (p.requested_by ?? "").toLowerCase().includes(n),
      );
    }
    return list;
  }, [proposals, deptFilter, q]);

  // Memoised so the derived counts below do not recompute on every render.
  const everything = useMemo(() => allProposals ?? [], [allProposals]);
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of everything) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [everything]);

  const all = everything;
  const pendingCount = all.filter((p) => p.status === "pending").length;
  const approvedCount = all.filter((p) => p.status !== "pending" && p.status !== "rejected").length;
  const committed = all.reduce((s, p) => s + (p.approved_amount ?? 0), 0);
  const awaitingAllot = (tracking ?? []).filter(
    (t) => t.quantity_delivered > 0 && t.quantity_allotted < t.quantity_delivered,
  ).length;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function openDecision(proposal: FinanceProposal, decision: "approve" | "reject") {
    setAmount(decision === "approve" ? String(proposal.estimated_amount ?? "") : "");
    setRemarks("");
    // Pre-fill with whoever is already nominated, so re-approving does not
    // silently drop an existing nomination.
    setAssignFaculty(
      proposal.assigned_faculty_id
        ? {
            id: proposal.assigned_faculty_id,
            name: proposal.assigned_faculty_name ?? "Selected faculty",
            designation: null,
            staff_code: null,
            department: proposal.assigned_faculty_department,
            email: null,
          }
        : null,
    );
    setAssignNote(proposal.assignment_note ?? "");
    setErr(null);
    setModal({ proposal, decision });
  }

  const parsed = Number(amount);
  const approving = modal?.decision === "approve";
  const exceeds = approving && fund ? parsed > fund.available_amount : false;
  const canSubmit = approving ? Number.isFinite(parsed) && parsed >= 1 && !exceeds : remarks.trim().length > 0;

  function submit() {
    if (!modal) return;
    setErr(null);
    decide.mutate(
      {
        id: modal.proposal.id,
        input: approving
          ? {
              decision: "approve",
              amount: Math.round(parsed),
              remarks: remarks.trim() || undefined,
              assigned_faculty_id: assignFaculty?.id,
              assignment_note: assignNote.trim() || undefined,
            }
          : { decision: "reject", remarks: remarks.trim() },
      },
      {
        onSuccess: (res) => {
          setModal(null);
          showToast(
            approving
              ? `${entityLabel} #${modal.proposal.id} approved · ${money(res.approved_amount)} committed`
              : `${entityLabel} #${modal.proposal.id} rejected`,
          );
        },
        onError: (e) => setErr(e instanceof Error ? e.message : "Could not record that decision"),
      },
    );
  }

  function removeAllotment(a: Allotment) {
    deleteAllotment.mutate(a.id, {
      onSuccess: () => showToast(`Allotment to ${a.faculty_name} removed`),
      onError: (e) => showToast(e instanceof Error ? e.message : "Could not remove that allotment"),
    });
  }

  return (
    <div>
      <PageHead title={title} sub={sub} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 22 }}>
        <StatCard
          label="Awaiting decision"
          value={String(pendingCount)}
          icon="approve"
          hi={String(all.length)}
          sub={`${entityLabel} in view`}
          pct={all.length > 0 ? (pendingCount / all.length) * 100 : 0}
          foot={`${approvedCount} approved so far`}
          delay={0}
        />
        <StatCard
          label="Committed value"
          value={moneyCompact(committed)}
          icon="ledger"
          hi={String(approvedCount)}
          sub="approved proposals"
          pct={fund && fund.total_amount > 0 ? (committed / fund.total_amount) * 100 : 0}
          foot={fund ? `of ${money(fund.total_amount)} total fund` : "No fund set"}
          delay={55}
        />
        <StatCard
          label="Fund available"
          value={fund ? moneyCompact(fund.available_amount) : "Not set"}
          icon="wallet"
          hi={fund ? `${(100 - fund.utilisation_pct).toFixed(1)}%` : "—"}
          sub="unspent"
          pct={fund ? 100 - fund.utilisation_pct : 0}
          foot={fund ? `${fund.academic_year} · ${fund.is_locked ? "locked" : "open"}` : "Set it in Finance Overview"}
          delay={110}
        />
        <StatCard
          label="Awaiting allotment"
          value={String(awaitingAllot)}
          icon="faculty"
          hi={String((tracking ?? []).length)}
          sub="orders tracked"
          pct={(tracking ?? []).length > 0 ? (awaitingAllot / (tracking ?? []).length) * 100 : 0}
          foot="Delivered but not handed over"
          delay={165}
        />
      </div>

      {!fund && (
        <div data-fin-lift="" style={{ ...cardSx, marginTop: 22 }}>
          <h2 style={panelTitleSx}>No open finance fund</h2>
          <p style={{ fontSize: 12.6, color: GREY.muted, margin: "6px 0 0" }}>
            Set a total amount in Finance Overview before approving — approvals are paid out of the fund.
          </p>
        </div>
      )}

      <div style={{ ...filterBarSx, marginTop: 22 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${entityLabel} by item, reference, vendor or requester…`} style={inputSx} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectSx}>
          {[
            { v: "pending", l: "Awaiting decision" },
            { v: "finance_approved", l: "Finance approved" },
            { v: "hod_approved", l: "HoD approved" },
            { v: "principal_approved", l: "Principal approved" },
            { v: "rejected", l: "Rejected" },
          ].map((o) => (
            <option key={o.v} value={o.v}>
              {o.l} ({statusCounts[o.v] ?? 0})
            </option>
          ))}
          <option value="">All statuses ({everything.length})</option>
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={selectSx}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {(q || deptFilter || statusFilter !== "pending") && (
          <button onClick={() => { setQ(""); setDeptFilter(""); setStatusFilter("pending"); }} style={clearBtnSx}>
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 70, textAlign: "center", fontSize: 13.1, color: GREY.faint }}>Loading queue…</div>
      ) : rows.length === 0 ? (
        <div style={cardSx}>
          <Empty
            title={`No ${entityLabel} in this state`}
            hint={
              everything.length > 0
                ? `Nothing is ${statusFilter ? "in that state" : "here"} right now, but ${everything.length} ${entityLabel} proposal${everything.length === 1 ? "" : "s"} exist in other states.`
                : `No ${entityLabel} proposals have reached Finance yet.`
            }
          />
          {everything.length > 0 && statusFilter !== "" && (
            <div style={{ textAlign: "center", paddingBottom: 26 }}>
              <button onClick={() => setStatusFilter("")} style={primaryBtnSx}>
                Show all {everything.length} {entityLabel}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...cardSx, padding: 0, overflow: "hidden" }}>
          {/* Column header keeps the list scannable instead of free-form text. */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", background: BLUE.wash, borderBottom: `1px solid ${GREY.border}`, fontSize: 10.8, fontWeight: 600, color: GREY.muted, letterSpacing: 0.3 }}>
            <span style={{ flex: "1 1 300px", minWidth: 0 }}>PROPOSAL</span>
            <span style={{ flex: "0 0 150px" }}>DEPARTMENT</span>
            <span style={{ flex: "0 0 104px" }}>STATUS</span>
            <span style={{ flex: "0 0 108px", textAlign: "right" }}>AMOUNT</span>
            <span style={{ flex: "0 0 208px", textAlign: "right" }}>ACTION</span>
          </div>

          {rows.map((p, i) => {
            const open = expanded === p.id;
            const isPending = p.status === "pending";
            const t = trackingByProposal.get(p.id);
            const canAllot =
              t && (t.delivery_status === "delivered" || t.delivery_status === "partially_delivered") &&
              t.quantity_delivered > t.quantity_allotted;

            return (
              <div key={p.id} style={{ borderBottom: `1px solid ${GREY.rule}` }}>
                <div
                  data-fin-row=""
                  className="fin-rise"
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 20px", animationDelay: `${Math.min(i * 35, 210)}ms` }}
                >
                  <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ fontSize: 13.1, fontWeight: 600, color: BLUE.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.title}
                      </span>
                      {p.reference && (
                        <span style={{ ...monoSx, fontSize: 10.5, color: GREY.muted, background: GREY.hair, borderRadius: 5, padding: "2px 7px", flex: "0 0 auto" }}>
                          {p.reference}
                        </span>
                      )}
                      {p.assigned_faculty_name && (
                        <span
                          title={`Allotted to ${p.assigned_faculty_name}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: BLUE.strong, background: BLUE.soft, border: `1px solid ${BLUE.line}`, borderRadius: 999, padding: "2px 8px", flex: "0 0 auto" }}
                        >
                          {p.assigned_faculty_name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.6, color: GREY.muted, marginTop: 3 }}>
                      Qty {p.quantity ?? "—"} · {p.vendor ?? "no vendor"}
                      {p.needed_by ? ` · needed ${formatDate(p.needed_by)}` : ""}
                    </div>
                  </div>

                  <div style={{ flex: "0 0 150px", fontSize: 11.8, color: GREY.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.department ?? "—"}
                  </div>

                  <div style={{ flex: "0 0 104px" }}>
                    <Chip variant={isPending ? "solid" : p.status === "rejected" ? "quiet" : "soft"}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Chip>
                  </div>

                  <div style={{ flex: "0 0 108px", textAlign: "right" }}>
                    <div style={{ ...monoSx, fontSize: 13.1, fontWeight: 700, color: BLUE.ink }}>
                      {money(p.approved_amount ?? p.estimated_amount)}
                    </div>
                    <div style={{ fontSize: 10.3, color: GREY.faint }}>
                      {p.approved_amount !== null ? "approved" : "estimate"}
                    </div>
                  </div>

                  <div style={{ flex: "0 0 208px", display: "flex", gap: 7, justifyContent: "flex-end" }}>
                    <button data-fin-soft="" onClick={() => setExpanded(open ? null : p.id)} style={softBtnSx}>
                      {open ? "Hide" : "Details"}
                    </button>
                    {isPending ? (
                      <>
                        <button data-fin-danger="" onClick={() => openDecision(p, "reject")} style={dangerBtnSx}>
                          Reject
                        </button>
                        <button
                          onClick={() => openDecision(p, "approve")}
                          disabled={!fund}
                          title={!fund ? "Set a fund total first" : undefined}
                          style={{ ...primaryBtnSx, opacity: fund ? 1 : 0.5, cursor: fund ? "pointer" : "not-allowed" }}
                        >
                          Approve
                        </button>
                      </>
                    ) : canAllot ? (
                      <button onClick={() => { setEditingAllotment(null); setAllotFor(t!); }} style={primaryBtnSx}>
                        Allot faculty
                      </button>
                    ) : null}
                  </div>
                </div>

                {open && (
                  <div className="fin-rise" style={{ background: BLUE.wash, borderTop: `1px solid ${GREY.border}`, padding: "18px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 26 }}>
                      <div>
                        <h3 style={{ ...panelTitleSx, fontSize: 13.1, marginBottom: 12 }}>Proposal</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(146px,1fr))", gap: 14 }}>
                          {[
                            { label: "Requested by", value: p.requested_by ?? "—" },
                            { label: "Raised on", value: formatDate(p.created_at) },
                            { label: "HoD reviewed", value: p.hod_reviewed_at ? formatDate(p.hod_reviewed_at) : "Not yet" },
                            { label: "Finance reviewed", value: p.finance_reviewed_at ? formatDate(p.finance_reviewed_at) : "Not yet" },
                            { label: "Order number", value: p.order_number ?? "Not placed" },
                          ].map((f) => (
                            <div key={f.label}>
                              <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint, letterSpacing: 0.3 }}>
                                {f.label.toUpperCase()}
                              </div>
                              <div style={{ fontSize: 12.2, marginTop: 3, fontWeight: 600, color: BLUE.ink }}>{f.value}</div>
                            </div>
                          ))}
                        </div>
                        {p.description && (
                          <div style={{ marginTop: 15 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint, letterSpacing: 0.3 }}>PURPOSE</div>
                            <div style={{ fontSize: 12.2, marginTop: 3, color: GREY.text, lineHeight: 1.6 }}>{p.description}</div>
                          </div>
                        )}
                        {(p.hod_remarks || p.finance_remarks) && (
                          <div style={{ display: "flex", gap: 12, marginTop: 15, flexWrap: "wrap" }}>
                            {p.hod_remarks && (
                              <div style={{ flex: "1 1 210px", background: "#fff", border: `1px solid ${GREY.border}`, borderRadius: 10, padding: "11px 13px" }}>
                                <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint }}>HOD REMARKS</div>
                                <div style={{ fontSize: 11.8, marginTop: 3, color: GREY.text }}>{p.hod_remarks}</div>
                              </div>
                            )}
                            {p.finance_remarks && (
                              <div style={{ flex: "1 1 210px", background: "#fff", border: `1px solid ${GREY.border}`, borderRadius: 10, padding: "11px 13px" }}>
                                <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint }}>FINANCE REMARKS</div>
                                <div style={{ fontSize: 11.8, marginTop: 3, color: GREY.text }}>{p.finance_remarks}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 style={{ ...panelTitleSx, fontSize: 13.1, marginBottom: 12 }}>Delivery &amp; allotment</h3>
                        {!t ? (
                          <div style={{ fontSize: 11.8, color: GREY.faint }}>
                            {p.order_number
                              ? "This order is not being tracked yet — start tracking on the tracking screen."
                              : "No order has been placed against this proposal yet."}
                          </div>
                        ) : (
                          <>
                            <div style={{ background: "#fff", border: `1px solid ${GREY.border}`, borderRadius: 12, padding: "16px 18px" }}>
                              <StageTracker kind={orderKind} status={t.delivery_status} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
                              <Meter
                                value={t.quantity_delivered}
                                total={t.quantity_ordered ?? t.quantity_delivered}
                                caption="Delivered"
                              />
                              <Meter
                                value={t.quantity_allotted}
                                total={t.quantity_delivered || (t.quantity_ordered ?? 0)}
                                caption="Allotted"
                              />
                            </div>
                            {t.allotments.length > 0 && (
                              <div style={{ marginTop: 14 }}>
                                <div style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint, marginBottom: 7, letterSpacing: 0.3 }}>
                                  CURRENT CUSTODY
                                </div>
                                <AllotmentChips
                                  allotments={t.allotments}
                                  onEdit={(a) => { setEditingAllotment(a); setAllotFor(t); }}
                                  onRemove={removeAllotment}
                                />
                              </div>
                            )}
                            {canAllot && (
                              <button
                                onClick={() => { setEditingAllotment(null); setAllotFor(t); }}
                                style={{ ...primaryBtnSx, marginTop: 14, fontSize: 12.2, padding: "10px 16px" }}
                              >
                                Allot to a faculty member
                              </button>
                            )}
                            {!canAllot && t.quantity_delivered === 0 && (
                              <div style={{ fontSize: 11.6, color: GREY.muted, marginTop: 12 }}>
                                Currently {stageLabel(orderKind, t.delivery_status).toLowerCase()} — allotment opens
                                once it is delivered.
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decision */}
      <FinanceModal
        open={modal !== null}
        title={approving ? `Approve ${entityLabel} #${modal?.proposal.id}` : `Reject ${entityLabel} #${modal?.proposal.id}`}
        sub={
          approving
            ? "The approved amount is committed out of the fund immediately and written to the ledger."
            : "No money moves. The reason is recorded against the proposal."
        }
        cta={approving ? "Approve & commit" : "Reject proposal"}
        busy={decide.isPending}
        disabled={!canSubmit}
        onClose={() => setModal(null)}
        onSubmit={submit}
      >
        {err && (
          <div style={{ background: BLUE.soft, border: `1px solid ${BLUE.line}`, borderRadius: 9, padding: "10px 13px", fontSize: 12.2, color: BLUE.strong, fontWeight: 600 }}>
            {err}
          </div>
        )}
        {modal && (
          <div style={{ background: GREY.hair, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 12.6, fontWeight: 600, color: BLUE.ink }}>{modal.proposal.title}</div>
            <div style={{ fontSize: 11.8, color: GREY.muted, marginTop: 3 }}>
              {modal.proposal.department ?? "—"} · Qty {modal.proposal.quantity ?? "—"}
              {modal.proposal.vendor ? ` · ${modal.proposal.vendor}` : ""}
            </div>
          </div>
        )}
        {approving ? (
          <>
            <div>
              <div style={fieldLabelSx}>
                Approved amount (₹) <span style={{ color: BLUE.primary }}>*</span>
              </div>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="120000" style={fieldMonoSx} />
              {amount && Number.isFinite(parsed) && (
                <div style={{ fontSize: 12.2, fontWeight: 600, marginTop: 6, color: exceeds ? BLUE.strong : BLUE.primary }}>
                  {money(Math.round(parsed))}
                  {fund && !exceeds && (
                    <span style={{ color: GREY.muted, fontWeight: 500 }}>
                      {" "}· leaves {money(fund.available_amount - Math.round(parsed))}
                    </span>
                  )}
                  {exceeds && fund && <span> · exceeds the {money(fund.available_amount)} available</span>}
                </div>
              )}
            </div>
            <FacultyPicker
              label="Allot to faculty (optional)"
              selectedId={assignFaculty?.id ?? null}
              selectedLabel={
                assignFaculty
                  ? `${assignFaculty.name}${assignFaculty.department ? ` · ${assignFaculty.department}` : ""}`
                  : null
              }
              onSelect={setAssignFaculty}
              hint="Records who this order is for. Actual custody is confirmed on the tracking screen once it is delivered."
            />
            {assignFaculty && (
              <div>
                <div style={fieldLabelSx}>Allotment note</div>
                <input value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="e.g. For the CAD lab" style={fieldInputSx} />
              </div>
            )}
            <div>
              <div style={fieldLabelSx}>Remarks (optional)</div>
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any note for the record" style={fieldInputSx} />
            </div>
          </>
        ) : (
          <div>
            <div style={fieldLabelSx}>
              Reason for rejection <span style={{ color: BLUE.primary }}>*</span>
            </div>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Why is this being rejected?" style={fieldInputSx} />
          </div>
        )}
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
