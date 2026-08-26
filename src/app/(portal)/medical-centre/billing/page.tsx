"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Badge, Button, Icon, Input, Select, EmptyState, DataTable, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { usePharmacyStock, type StockItem } from "@/modules/medical-centre/api/pharmacy";
import { useTeam } from "@/modules/medical-centre/api/team";
import { useOpdQueue } from "@/modules/medical-centre/api/opd";
import { useServiceCharges, useBillHistory, useCreateBill, useCollectBill, useBillReceipt, type Bill, type BillItemInput } from "@/modules/medical-centre/api/billing";
import { MedicalReceiptDocument, RECEIPT_LOGO_SRC } from "@/modules/medical-centre/MedicalReceiptDocument";
import { formatDayAndTime } from "@/lib/utils/date";

/**
 * The rupee sign was previously written as a literal "\\u20b9" in JSX, which
 * React renders as those six characters rather than the symbol — which is why
 * the totals column and the Collected/Pending tiles read as escape codes.
 */
function rupees(value: number): string {
  return `\u20b9${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Selectable payment modes at the counter. The stored enum still allows
 * 'student_account' and 'staff_welfare' — historic bills carry them and the
 * receipt renders them — but neither is offered here any more: the health
 * centre settles in cash or by UPI.
 */
const PAYMENT_MODES: { value: CreateBillMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
];

type CreateBillMode = "cash" | "upi" | "student_account" | "staff_welfare";

const STATUS_TONE: Record<Bill["status"], BadgeTone> = { Paid: "accent", Pending: "accentDark", Settled: "neutral" };

/**
 * Bill history, rendered as a permanent section of the page rather than a
 * modal.
 *
 * It used to be a modal, which is why clearing the form appeared to "wipe the
 * history": the history was only ever visible transiently, so anything that
 * closed it looked destructive. It is now always on screen, and Clear form
 * touches nothing but the form fields.
 *
 * Collecting payment lives on each row here — deliberately separate from the
 * billing form, which is for raising a new bill.
 */
/**
 * Fetches one receipt and drives the browser print dialog for it.
 *
 * Mounted only while a bill is selected for printing, so nothing is fetched
 * until the user actually asks for a receipt. The document sits in a
 * `hidden print:block` container: invisible on screen and out of normal
 * layout, revealed only by the print stylesheet.
 *
 * The logo is decoded before print() is called. Browsers do not reliably
 * fetch images inside a display:none subtree, and firing the dialog straight
 * away printed the college crest blank — the same guard the fees receipt uses.
 */
function MedicalReceiptPrintHost({ billId, onDone }: { billId: number; onDone: () => void }) {
  const receipt = useBillReceipt(billId);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!receipt.data) return;

    function handleAfterPrint() {
      onDone();
    }
    window.addEventListener("afterprint", handleAfterPrint);

    let cancelled = false;
    let timer = 0;
    const open = () => {
      if (cancelled) return;
      setReady(true);
      // One frame for the portal to paint before the dialog captures it.
      timer = window.setTimeout(() => window.print(), 80);
    };

    const logo = new window.Image();
    logo.src = RECEIPT_LOGO_SRC;
    if (logo.complete) {
      open();
    } else {
      logo.onload = open;
      // Still print if the asset is missing, so a broken image can never
      // block a receipt the cashier needs.
      logo.onerror = open;
    }

    return () => {
      cancelled = true;
      logo.onload = null;
      logo.onerror = null;
      window.removeEventListener("afterprint", handleAfterPrint);
      window.clearTimeout(timer);
    };
  }, [receipt.data, onDone]);

  if (receipt.isError) {
    return (
      <div className="mt-3 rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
        Could not load that receipt.{" "}
        <button type="button" onClick={onDone} className="underline">
          Dismiss
        </button>
      </div>
    );
  }

  if (!receipt.data) {
    return <div className="mt-3 text-[12.5px] text-subtle">Preparing receipt…</div>;
  }

  return createPortal(
    <div id="medical-receipt-print-root" data-print-root className={ready ? "hidden print:block" : "hidden"}>
      <MedicalReceiptDocument receipt={receipt.data} />
    </div>,
    document.body,
  );
}

function BillHistoryPanel() {
  // Which bill is being printed. Set by the Print button; the print host
  // below fetches that receipt and opens the browser print dialog.
  const [printBillId, setPrintBillId] = useState<number | null>(null);
  const history = useBillHistory();
  const collect = useCollectBill();
  const bills = history.data?.bills ?? [];
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function collectPayment(billId: number) {
    setError(null);
    try {
      await collect.mutateAsync(billId);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not collect this payment.");
    }
  }

  const columns: DataTableColumn<Bill>[] = [
    {
      key: "bill",
      header: "Bill",
      width: "minmax(150px, 1.1fr)",
      // Bill number and when it was raised describe the same thing, so they
      // share a cell instead of two narrow columns — and the timestamp is
      // formatted rather than the raw ISO string the API returns.
      render: (row) => (
        <div className="min-w-0">
          <div className="font-mono text-[13px] font-bold text-primary">{row.id}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-subtle">{formatDayAndTime(row.when)}</div>
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      width: "minmax(170px, 1.4fr)",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-bold text-ink">{row.patient}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-muted">
            {row.condition && row.condition !== "\u2014" ? row.condition : "No complaint recorded"}
          </div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Medicines & services",
      width: "minmax(220px, 2fr)",
      render: (row) => (
        <button
          type="button"
          onClick={() => setExpanded((cur) => (cur === row.billId ? null : row.billId))}
          className="min-w-0 max-w-full text-left"
          title={row.items}
        >
          <span className="block truncate text-[13px] text-body hover:text-primary">{row.items || "\u2014"}</span>
          <span className="mt-0.5 block text-[11px] font-bold text-primary">
            {expanded === row.billId ? "Hide items" : "View items"}
          </span>
        </button>
      ),
    },
    {
      key: "attended",
      header: "Attended by",
      width: "minmax(150px, 1.2fr)",
      // Who saw the patient and how they paid are both context on the visit.
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] text-body">{row.staff}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-subtle">{row.mode}</div>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      width: "130px",
      align: "right",
      render: (row) => (
        <div>
          <div className="font-mono text-[14px] font-extrabold text-primary">{rupees(row.total)}</div>
          <div className="mt-1 flex justify-end">
            <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "180px",
      align: "right",
      // One action column instead of a separate Receipt and Payment pair: a
      // settled bill only offers a receipt, an unpaid one also offers collect.
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setPrintBillId(row.billId)}
            className="inline-flex items-center gap-1 rounded-[8px] border border-border-default px-2.5 py-1.5 text-[12px] font-bold text-body hover:bg-surface-tint"
            title={`Print receipt ${row.id}`}
          >
            <Icon name="print" size={14} />
            Print
          </button>
          {row.status === "Pending" ? (
            <button
              type="button"
              onClick={() => void collectPayment(row.billId)}
              disabled={collect.isPending}
              className="rounded-[8px] border border-border-accent bg-accent-50 px-2.5 py-1.5 text-[12px] font-bold text-primary disabled:opacity-50"
            >
              Collect
            </button>
          ) : (
            <span className="text-[11.5px] text-subtle">Settled</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border-default bg-surface p-[20px_22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-extrabold text-ink">Bill history</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {bills.length} bill{bills.length === 1 ? "" : "s"} on record \u00b7 collect pending payments from here
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-[11px] border border-border-default px-4 py-2.5">
            <div className="text-[11.5px] text-muted">Collected</div>
            <div className="mt-0.5 text-[19px] font-extrabold text-primary">{rupees(history.data?.collected ?? 0)}</div>
          </div>
          <div className="rounded-[11px] border border-border-default px-4 py-2.5">
            <div className="text-[11.5px] text-muted">Pending</div>
            <div className="mt-0.5 text-[19px] font-extrabold text-primary-dark">{rupees(history.data?.pending ?? 0)}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {error}
        </div>
      )}

      {history.isLoading ? (
        <EmptyState message="Loading\u2026" />
      ) : (
        <DataTable columns={columns} data={bills} rowKey={(row) => row.billId} emptyMessage="No bills recorded yet." hoverableRows />
      )}

      {printBillId !== null && (
        <MedicalReceiptPrintHost billId={printBillId} onDone={() => setPrintBillId(null)} />
      )}

      {expanded != null && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint p-4">
          <div className="text-[12.5px] font-bold text-primary">Full line items</div>
          <div className="mt-1.5 text-[13px] text-body">
            {bills.find((b) => b.billId === expanded)?.items || "No items recorded on this bill."}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();

  const pharmacy = usePharmacyStock();
  const team = useTeam();
  const queue = useOpdQueue();
  const services = useServiceCharges();
  const createBill = useCreateBill();
  const historyForCount = useBillHistory();

  const stock = pharmacy.data ?? [];
  const staff = team.data ?? [];
  const onDutyStaff = staff.filter((t) => t.duty);
  const waitingQueue = (queue.data ?? []).filter((q) => q.status !== "done");
  const serviceList = services.data ?? [];

  const [patient, setPatient] = useState("");
  const [dept, setDept] = useState("");
  const [condition, setCondition] = useState("");
  const [staffId, setStaffId] = useState<number | undefined>(undefined);
  const [mode, setMode] = useState<CreateBillMode>("cash");
  // Only meaningful for UPI. Cleared whenever the mode moves away from UPI so a
  // stale reference can never be attached to a cash bill.
  const [upiTxnId, setUpiTxnId] = useState("");
  // Set when the patient is pulled from the OPD queue; null for a walk-in typed
  // in by hand.
  const [visitId, setVisitId] = useState<number | null>(null);

  const [medQuery, setMedQuery] = useState("");
  const [pickerQty, setPickerQty] = useState<Record<number, number>>({});
  const [items, setItems] = useState<BillItemInput[]>([]);
  // Starts empty rather than pre-selecting a hardcoded name: the catalogue is
  // loaded from medical_services (where it is "General Consultation", not
  // "Consultation"), so a guessed default matched nothing and submitting the
  // bill crashed on the missing row.
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inCart = (stockId: number) => items.find((i) => i.stock_id === stockId)?.quantity ?? 0;
  const availableToAdd = (item: StockItem) => Math.max(0, item.qty - inCart(item.id));

  const matchingMedicines = useMemo(() => {
    const q = medQuery.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter((s) => s.name.toLowerCase().includes(q) || s.use.toLowerCase().includes(q) || s.form.toLowerCase().includes(q));
  }, [stock, medQuery]);

  function pullFromQueue(id: string) {
    const q = waitingQueue.find((o) => String(o.id) === id);
    if (q) {
      setPatient(q.name);
      setDept(q.dept);
      setCondition(q.complaint);
      // The queue row IS a medical_visits row, which already knows whether this
      // is a student or a faculty member. Carrying its id onto the bill is what
      // lets the receipt print a real roll number instead of guessing from the
      // typed name.
      setVisitId(q.id);
    }
  }

  function setPickerRowQty(stockId: number, qty: number, max: number) {
    setPickerQty((prev) => ({ ...prev, [stockId]: Math.max(1, Math.min(qty, Math.max(1, max))) }));
  }

  function addMedicine(item: StockItem) {
    const qty = pickerQty[item.id] ?? 1;
    if (availableToAdd(item) < qty) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.stock_id === item.id);
      if (existing) return prev.map((i) => (i.stock_id === item.id ? { ...i, quantity: i.quantity + qty } : i));
      return [...prev, { item_type: "medicine", stock_id: item.id, description: item.name, quantity: qty, rate: item.rate }];
    });
    setPickerQty((prev) => ({ ...prev, [item.id]: 1 }));
  }

  function adjustItemQty(description: string, delta: number) {
    setItems((prev) => {
      const target = prev.find((i) => i.description === description);
      if (!target) return prev;
      const cap = target.stock_id ? stock.find((s) => s.id === target.stock_id)?.qty ?? target.quantity : target.quantity;
      const next = Math.max(1, Math.min(target.quantity + delta, cap));
      return prev.map((i) => (i.description === description ? { ...i, quantity: next } : i));
    });
  }

  function removeItem(description: string) {
    setItems((prev) => prev.filter((i) => i.description !== description));
  }

  function toggleService(name: string) {
    setSelectedServices((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));
  }

  const medTotal = items.reduce((sum, i) => sum + i.rate * i.quantity, 0);
  const svcTotal = selectedServices.reduce((sum, s) => sum + (serviceList.find((svc) => svc.name === s)?.rate ?? 0), 0);
  const billTotal = medTotal + svcTotal;
  const qtyTotal = items.reduce((sum, i) => sum + i.quantity, 0);

  function clearForm() {
    setUpiTxnId("");
    setVisitId(null);
    setItems([]);
    setSelectedServices([]);
    setPatient("");
    setDept("");
    setCondition("");
    setError(null);
  }

  async function submitBill(status: "paid" | "pending") {
    if (!patient.trim()) {
      setError("Patient name is required.");
      return;
    }
    // The API enforces this too; catching it here keeps the operator from
    // losing a filled-in bill to a round-trip rejection.
    if (mode === "upi" && !upiTxnId.trim()) {
      setError("Enter the UPI transaction ID for a UPI payment.");
      return;
    }
    setError(null);
    // Resolved against the loaded catalogue and filtered, never asserted: a
    // selection that no longer exists (catalogue edited in another tab) must
    // not take the whole bill down.
    const serviceItems: BillItemInput[] = selectedServices
      .map((name) => serviceList.find((s) => s.name === name))
      .filter((svc): svc is NonNullable<typeof svc> => svc !== undefined)
      .map((svc) => ({
        item_type: "service" as const,
        description: svc.name,
        quantity: 1,
        rate: svc.rate,
      }));
    try {
      await createBill.mutateAsync({
        patient_name: patient.trim(),
        patient_dept: dept.trim() || undefined,
        condition: condition.trim() || undefined,
        attended_by_staff_id: staffId,
        payment_mode: mode,
        visit_id: visitId ?? undefined,
        // Sent only for UPI; the API rejects a reference on any other mode.
        upi_transaction_id: mode === "upi" ? upiTxnId.trim() : undefined,
        status,
        items: [...items, ...serviceItems],
      });
      clearForm();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this bill.");
    }
  }

  const itemColumns: DataTableColumn<BillItemInput>[] = [
    {
      key: "desc",
      header: "Description",
      width: "1.8fr",
      render: (row) => {
        const s = row.stock_id ? stock.find((x) => x.id === row.stock_id) : undefined;
        return (
          <div>
            <div className="font-bold text-ink">{row.description}</div>
            {s && (
              <div className="text-[12px] text-subtle">
                {s.use} · {s.form}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "qty",
      header: "Qty",
      width: "1.1fr",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => adjustItemQty(row.description, -1)}
            className="flex size-[26px] items-center justify-center rounded-[7px] border border-border-default font-bold text-body hover:bg-surface-tint"
          >
            −
          </button>
          <span className="min-w-[20px] text-center font-mono text-[13.5px] text-body">{row.quantity}</span>
          <button
            type="button"
            onClick={() => adjustItemQty(row.description, 1)}
            disabled={row.item_type === "service"}
            title={row.item_type === "service" ? "Services are billed once per visit" : undefined}
            className="flex size-[26px] items-center justify-center rounded-[7px] border border-border-default font-bold text-body hover:bg-surface-tint disabled:opacity-40"
          >
            +
          </button>
        </div>
      ),
    },
    { key: "rate", header: "Rate", width: "0.7fr", render: (row) => <span className="font-mono text-body">₹{row.rate}</span> },
    { key: "amount", header: "Amount", width: "0.8fr", render: (row) => <span className="font-mono font-bold text-ink">₹{row.rate * row.quantity}</span> },
    {
      key: "remove",
      header: "",
      width: "0.4fr",
      align: "right",
      render: (row) => (
        <button type="button" onClick={() => removeItem(row.description)} className="text-[14px] font-bold text-danger-fg">
          ×
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Billing</h1>
          <p className="mt-1 text-[13px] text-muted">Consultation is free for students and staff · medicines and procedures are charged at cost.</p>
        </div>
        <div className="rounded-[11px] border border-border-default px-4 py-2.5 text-right">
          <div className="text-[11.5px] text-muted">Bills on record</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">{historyForCount.data?.bills.length ?? 0}</div>
        </div>
      </div>

      <div className="rounded-card border border-border-default bg-surface p-[16px_18px]">
        <div className="mb-3 text-[13px] font-bold uppercase tracking-[.05em] text-muted">Staff on duty at OPD now</div>
        <div className="flex flex-wrap gap-3">
          {onDutyStaff.length === 0 && <span className="text-[13px] text-subtle">No staff marked on duty.</span>}
          {onDutyStaff.map((s) => (
            <button
              key={s.sid}
              type="button"
              onClick={() => router.push(`/medical-centre/team/${s.id}`)}
              className="flex items-center gap-2.5 rounded-[10px] border border-border-default px-3 py-2 hover:bg-surface-tint"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-icon-chip text-[12px] font-bold text-primary">
                {s.name.split(" ").map((n) => n[0]).slice(-2).join("")}
              </span>
              <div className="text-left">
                <div className="text-[13px] font-bold text-ink">{s.name}</div>
                <div className="text-[11.5px] text-subtle">
                  {s.desig} · {s.timing}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border-default bg-surface p-[18px_20px]">
            <h2 className="mb-3 text-[17px] font-extrabold text-ink">New bill</h2>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Pull the patient from the queue</label>
                <Select className="mt-1.5" defaultValue="" onChange={(e) => pullFromQueue(e.target.value)}>
                  <option value="">Select from OPD queue</option>
                  {waitingQueue.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.token} · {q.name} · {q.dept}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Patient name</label>
                <Input
                  className="mt-1.5"
                  placeholder="Student or staff name"
                  value={patient}
                  onChange={(e) => {
                    setPatient(e.target.value);
                    // Editing the name by hand means this is no longer the
                    // queued patient, so the visit link is dropped rather than
                    // left pointing at someone else.
                    setVisitId(null);
                  }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Department / year</label>
                <Input className="mt-1.5" placeholder="CSE Sem 5" value={dept} onChange={(e) => setDept(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Condition / diagnosis</label>
                <Input className="mt-1.5" placeholder="Fever with throat pain" value={condition} onChange={(e) => setCondition(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Attended by</label>
                <Select className="mt-1.5" value={staffId ?? ""} onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">Select staff</option>
                  {staff.map((t) => (
                    <option key={t.sid} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Payment mode</label>
                <Select
                  className="mt-1.5"
                  value={mode}
                  onChange={(e) => {
                    const next = e.target.value as CreateBillMode;
                    setMode(next);
                    if (next !== "upi") setUpiTxnId("");
                  }}
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* A UPI settlement has a reference the patient can be shown and
                  the college can reconcile against, so it is required here and
                  printed on the receipt. No other mode has one, so the field
                  only exists for UPI. */}
              {mode === "upi" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">
                    UPI transaction ID
                  </label>
                  <Input
                    className="mt-1.5"
                    value={upiTxnId}
                    onChange={(e) => setUpiTxnId(e.target.value)}
                    placeholder="e.g. 428913756201"
                    maxLength={60}
                  />
                  <p className="mt-1 text-[11.5px] text-subtle">Printed on the receipt.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-card border border-border-default bg-surface p-[18px_20px]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-extrabold text-ink">Pharmacy items</h2>
              <span className="text-[12.5px] text-subtle">Rates are per unit shown in the form column</span>
            </div>

            <div className="mb-4.5 overflow-hidden rounded-[11px] border border-border-default">
              <div className="flex items-center gap-2.5 border-b border-divider bg-surface-tint px-3.5 py-2.5">
                <Icon name="search" size={16} className="text-subtle" />
                <input
                  className="w-full min-w-0 border-0 bg-transparent text-[14.5px] text-ink placeholder:text-subtle focus:outline-none"
                  placeholder="Search the pharmacy · name, use or form"
                  value={medQuery}
                  onChange={(e) => setMedQuery(e.target.value)}
                />
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {matchingMedicines.length === 0 ? (
                  <div className="py-6 text-center text-[14px] text-subtle">No medicine matches that search.</div>
                ) : (
                  matchingMedicines.map((s) => {
                    const available = availableToAdd(s);
                    const qty = Math.min(pickerQty[s.id] ?? 1, Math.max(1, available));
                    return (
                      <div key={s.id} className="flex items-center gap-3 border-b border-divider px-3.5 py-3 last:border-0 hover:bg-surface-tint">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14.5px] font-bold text-ink">{s.name}</span>
                            <span className={`shrink-0 rounded-[6px] px-2 py-0.5 text-[11.5px] font-bold ${available > 0 ? "bg-icon-chip text-primary" : "bg-danger-bg text-danger-fg"}`}>
                              {available > 0 ? `${available} in stock` : "out of stock"}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[12.5px] text-subtle">
                            {s.use} · {s.form}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[13.5px] text-body">₹{s.rate}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPickerRowQty(s.id, qty - 1, available)}
                            className="flex size-[30px] items-center justify-center rounded-[8px] border border-border-default font-bold text-body hover:bg-surface"
                          >
                            −
                          </button>
                          <span className="min-w-[22px] text-center font-mono text-[13.5px]">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setPickerRowQty(s.id, qty + 1, available)}
                            className="flex size-[30px] items-center justify-center rounded-[8px] border border-border-default font-bold text-body hover:bg-surface"
                          >
                            +
                          </button>
                        </div>
                        <Button variant="primarySmall" className="w-auto shrink-0" onClick={() => addMedicine(s)} disabled={available === 0}>
                          Add
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <h2 className="mb-2.5 text-[15px] font-extrabold text-ink">On this bill</h2>
            {items.length === 0 ? (
              <EmptyState message="No medicine added yet." />
            ) : (
              <DataTable columns={itemColumns} data={items} rowKey={(row) => row.description} hoverableRows={false} />
            )}
          </div>

          <div className="rounded-card border border-border-default bg-surface p-[18px_20px]">
            <h2 className="mb-3 text-[17px] font-extrabold text-ink">Service charges</h2>
            <div className="flex flex-wrap gap-2.5">
              {serviceList.map((svc) => (
                <button
                  key={svc.name}
                  type="button"
                  onClick={() => toggleService(svc.name)}
                  className={`rounded-pill border px-3.5 py-2 text-[12.5px] font-bold ${
                    selectedServices.includes(svc.name) ? "border-primary bg-accent-50 text-primary" : "border-border-default text-ink-soft"
                  }`}
                >
                  {svc.name} · ₹{svc.rate}
                  <span className="ml-1.5 font-normal text-subtle">{svc.note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky top-4 rounded-card border border-border-accent bg-accent-50 p-[18px_20px]">
          <h2 className="mb-4 text-[19px] font-extrabold tracking-[-.02em] text-primary-dark">Bill summary</h2>
          <div className="flex flex-col gap-2.5 text-[14px]">
            <div className="flex justify-between">
              <span className="text-primary-dark/70">Patient</span>
              <span className="font-bold text-ink">{patient || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-dark/70">Department</span>
              <span className="font-bold text-ink">{dept || "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-primary-dark/70">Condition</span>
              <span className="text-right font-bold text-ink">{condition || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-dark/70">Attended by</span>
              <span className="font-bold text-ink">{staff.find((t) => t.id === staffId)?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-dark/70">Items</span>
              <span className="font-bold text-ink">
                {items.length} lines · {qtyTotal} units
              </span>
            </div>
          </div>
          <div className="my-4 flex flex-col gap-2.5 border-t border-border-accent pt-4 text-[14px]">
            <div className="flex justify-between">
              <span className="text-primary-dark/70">Medicines</span>
              <span className="font-mono text-ink">₹{medTotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-dark/70">Services</span>
              <span className="font-mono text-ink">₹{svcTotal}</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between border-t border-border-accent pt-4">
            <span className="text-[15px] font-extrabold text-primary-dark">Total payable</span>
            <span className="text-[30px] font-extrabold tracking-[-.03em] text-primary-dark">₹{billTotal}</span>
          </div>
          {error && <div className="mt-3 text-[12.5px] font-semibold text-danger-fg">{error}</div>}
          <div className="mt-5 flex flex-col gap-2.5">
            <Button variant="primarySmall" onClick={() => submitBill("paid")} disabled={createBill.isPending}>
              Collect payment
            </Button>
            <Button variant="secondary" onClick={() => submitBill("pending")} disabled={createBill.isPending}>
              Save as pending
            </Button>
            {/* Clears only the fields above. Saved bills are untouched and stay
                listed in Bill history below. */}
            <button
              type="button"
              onClick={clearForm}
              title="Empties this form only — saved bills stay in Bill history below"
              className="text-center text-[12.5px] font-bold text-subtle hover:text-ink"
            >
              Clear form
            </button>
          </div>
          <p className="mt-3.5 text-[12.5px] leading-[1.45] text-primary-dark/70">
            Adding a medicine reserves it from pharmacy stock straight away. Removing it or clearing the form puts the units back.
          </p>
        </div>
      </div>

      {/* Always on screen, below the form. Clearing the form cannot make this
          disappear, and collecting a payment happens here rather than in the
          form that raises a new bill. */}
      <BillHistoryPanel />
    </div>
  );
}
