"use client";

import { useState } from "react";
import {
  PageHeader,
  Button,
  Badge,
  type BadgeTone,
  Card,
  EmptyState,
  Modal,
  FormField,
  Input,
  Select,
  Textarea,
  DataTable,
  type DataTableColumn,
  useToast,
} from "@/modules/admin/components/ui";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/utils/errors";
import {
  useMachines,
  useCreateMachine,
  useUpdateMachine,
  useDeleteMachine,
  usePrintRates,
  useCreatePrintRate,
  useUpdatePrintRate,
  useDeletePrintRate,
  useFinishingRates,
  useCreateFinishingRate,
  useUpdateFinishingRate,
  useDeleteFinishingRate,
  type Machine,
  type MachineStatus,
  type MachineCategory,
  type PrintRate,
  type FinishingRate,
} from "@/modules/stationary/api/operations";

// Ported from "Stationery Portal.dc.html"'s Operations page: "Printers &
// Machines" tab (machines grid, lines 251-273) and "Price Detail" tab
// (rateRows + bindRows tables, lines 276-307). Backed by 3 new tables
// (stationary_machines/stationary_print_rates/stationary_finishing_rates),
// user-approved before creation.

type Tab = "machines" | "pricing";

const STATUS_LABEL: Record<MachineStatus, string> = {
  working: "Working",
  under_repair: "Under repair",
  maintenance: "Maintenance",
};
const STATUS_TONE: Record<MachineStatus, BadgeTone> = {
  working: "success",
  under_repair: "danger",
  maintenance: "warning",
};

function formatRupees(n: number): string {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

interface MachineForm {
  name: string;
  model: string;
  category: MachineCategory;
  status: MachineStatus;
  note: string;
}
const EMPTY_MACHINE: MachineForm = { name: "", model: "", category: "printer", status: "working", note: "" };

interface PrintRateForm {
  service: string;
  paper_size: string;
  bw_price: string;
  bw_unit: string;
  colour_price: string;
  colour_unit: string;
  bulk_price: string;
  bulk_unit: string;
}
const EMPTY_PRINT_RATE: PrintRateForm = {
  service: "",
  paper_size: "A4",
  bw_price: "",
  bw_unit: "page",
  colour_price: "",
  colour_unit: "page",
  bulk_price: "",
  bulk_unit: "page",
};

interface FinishingForm {
  item_name: string;
  note: string;
  price: string;
}
const EMPTY_FINISHING: FinishingForm = { item_name: "", note: "", price: "" };

export default function StationaryOperationsPage() {
  const [tab, setTab] = useState<Tab>("machines");
  const { show } = useToast();

  // Machines
  const { data: machines, isLoading: machinesLoading } = useMachines();
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [machineEditTarget, setMachineEditTarget] = useState<Machine | null>(null);
  const [machineForm, setMachineForm] = useState<MachineForm>(EMPTY_MACHINE);
  const [machineDeleteTarget, setMachineDeleteTarget] = useState<Machine | null>(null);
  const [faultModalOpen, setFaultModalOpen] = useState(false);
  const [faultMachineId, setFaultMachineId] = useState<string>("");
  const [faultNote, setFaultNote] = useState("");

  // Print rates
  const { data: printRates, isLoading: printLoading } = usePrintRates();
  const createPrintRate = useCreatePrintRate();
  const updatePrintRate = useUpdatePrintRate();
  const deletePrintRate = useDeletePrintRate();
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateEditTarget, setRateEditTarget] = useState<PrintRate | null>(null);
  const [rateForm, setRateForm] = useState<PrintRateForm>(EMPTY_PRINT_RATE);
  const [rateDeleteTarget, setRateDeleteTarget] = useState<PrintRate | null>(null);

  // Finishing rates
  const { data: finishingRates, isLoading: finishingLoading } = useFinishingRates();
  const createFinishing = useCreateFinishingRate();
  const updateFinishing = useUpdateFinishingRate();
  const deleteFinishing = useDeleteFinishingRate();
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishEditTarget, setFinishEditTarget] = useState<FinishingRate | null>(null);
  const [finishForm, setFinishForm] = useState<FinishingForm>(EMPTY_FINISHING);
  const [finishDeleteTarget, setFinishDeleteTarget] = useState<FinishingRate | null>(null);

  // ── Machines ────────────────────────────────────────────────────────

  function openAddMachine() {
    setMachineEditTarget(null);
    setMachineForm(EMPTY_MACHINE);
    setMachineModalOpen(true);
  }
  function openEditMachine(m: Machine) {
    setMachineEditTarget(m);
    setMachineForm({ name: m.name, model: m.model, category: m.category, status: m.status, note: m.note ?? "" });
    setMachineModalOpen(true);
  }
  function submitMachine() {
    if (!machineForm.name.trim() || !machineForm.model.trim()) {
      show("Name and model are required.", "error");
      return;
    }
    const input = {
      name: machineForm.name.trim(),
      model: machineForm.model.trim(),
      category: machineForm.category,
      status: machineForm.status,
      note: machineForm.note.trim() || undefined,
    };
    const mutation = machineEditTarget
      ? updateMachine.mutateAsync({ id: machineEditTarget.id, input })
      : createMachine.mutateAsync(input);
    mutation
      .then(() => {
        show(machineEditTarget ? "Machine updated." : "Machine added.", "success");
        setMachineModalOpen(false);
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }
  function handleDeleteMachine() {
    if (!machineDeleteTarget) return;
    deleteMachine.mutate(machineDeleteTarget.id, {
      onSuccess: () => {
        show("Machine removed.", "success");
        setMachineDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }
  function submitFault() {
    if (!faultMachineId || !faultNote.trim()) {
      show("Choose a machine and describe the fault.", "error");
      return;
    }
    updateMachine.mutate(
      { id: Number(faultMachineId), input: { status: "under_repair", note: faultNote.trim() } },
      {
        onSuccess: () => {
          show("Fault logged — machine marked under repair.", "success");
          setFaultModalOpen(false);
          setFaultMachineId("");
          setFaultNote("");
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  // ── Print rates ─────────────────────────────────────────────────────

  function openAddRate() {
    setRateEditTarget(null);
    setRateForm(EMPTY_PRINT_RATE);
    setRateModalOpen(true);
  }
  function openEditRate(r: PrintRate) {
    setRateEditTarget(r);
    setRateForm({
      service: r.service,
      paper_size: r.paper_size,
      bw_price: String(r.bw_price),
      bw_unit: r.bw_unit,
      colour_price: String(r.colour_price),
      colour_unit: r.colour_unit,
      bulk_price: String(r.bulk_price),
      bulk_unit: r.bulk_unit,
    });
    setRateModalOpen(true);
  }
  function submitRate() {
    const bw = Number(rateForm.bw_price);
    const colour = Number(rateForm.colour_price);
    const bulk = Number(rateForm.bulk_price);
    if (!rateForm.service.trim() || !bw || !colour || !bulk) {
      show("Service and all 3 prices are required.", "error");
      return;
    }
    const input = {
      service: rateForm.service.trim(),
      paper_size: rateForm.paper_size.trim(),
      bw_price: bw,
      bw_unit: rateForm.bw_unit.trim() || "page",
      colour_price: colour,
      colour_unit: rateForm.colour_unit.trim() || "page",
      bulk_price: bulk,
      bulk_unit: rateForm.bulk_unit.trim() || "page",
    };
    const mutation = rateEditTarget
      ? updatePrintRate.mutateAsync({ id: rateEditTarget.id, input })
      : createPrintRate.mutateAsync(input);
    mutation
      .then(() => {
        show(rateEditTarget ? "Rate updated." : "Rate added.", "success");
        setRateModalOpen(false);
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }
  function handleDeleteRate() {
    if (!rateDeleteTarget) return;
    deletePrintRate.mutate(rateDeleteTarget.id, {
      onSuccess: () => {
        show("Rate removed.", "success");
        setRateDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  // ── Finishing rates ─────────────────────────────────────────────────

  function openAddFinishing() {
    setFinishEditTarget(null);
    setFinishForm(EMPTY_FINISHING);
    setFinishModalOpen(true);
  }
  function openEditFinishing(f: FinishingRate) {
    setFinishEditTarget(f);
    setFinishForm({ item_name: f.item_name, note: f.note ?? "", price: String(f.price) });
    setFinishModalOpen(true);
  }
  function submitFinishing() {
    const price = Number(finishForm.price);
    if (!finishForm.item_name.trim() || !price) {
      show("Item name and price are required.", "error");
      return;
    }
    const input = { item_name: finishForm.item_name.trim(), note: finishForm.note.trim() || undefined, price };
    const mutation = finishEditTarget
      ? updateFinishing.mutateAsync({ id: finishEditTarget.id, input })
      : createFinishing.mutateAsync(input);
    mutation
      .then(() => {
        show(finishEditTarget ? "Item updated." : "Item added.", "success");
        setFinishModalOpen(false);
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }
  function handleDeleteFinishing() {
    if (!finishDeleteTarget) return;
    deleteFinishing.mutate(finishDeleteTarget.id, {
      onSuccess: () => {
        show("Item removed.", "success");
        setFinishDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  const printRateColumns: DataTableColumn<PrintRate>[] = [
    { key: "service", header: "Service", render: (r) => <span className="font-semibold text-admin-ink">{r.service}</span> },
    { key: "paper_size", header: "Paper size", render: (r) => r.paper_size },
    { key: "bw", header: "B&W", render: (r) => `${formatRupees(r.bw_price)} / ${r.bw_unit}` },
    { key: "colour", header: "Colour", render: (r) => `${formatRupees(r.colour_price)} / ${r.colour_unit}` },
    { key: "bulk", header: "Bulk (50+)", render: (r) => <span className="font-semibold text-admin-primary">{formatRupees(r.bulk_price)} / {r.bulk_unit}</span> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => openEditRate(r)} className="text-sm font-semibold text-admin-primary hover:text-admin-primary-deep">
            Edit
          </button>
          <button type="button" onClick={() => setRateDeleteTarget(r)} className="text-sm font-semibold text-admin-danger hover:text-admin-danger">
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Operations"
        description={tab === "machines" ? "Working, under repair and scheduled maintenance" : "Rate card for printing, paper sizes and binding"}
        actions={
          tab === "machines" ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setFaultModalOpen(true)}>
                Log a fault
              </Button>
              <Button variant="primary" onClick={openAddMachine}>
                <Icon name="add" size={16} /> Add machine
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={openAddFinishing}>
                <Icon name="add" size={16} /> Add finishing item
              </Button>
              <Button variant="primary" onClick={openAddRate}>
                <Icon name="add" size={16} /> Add rate
              </Button>
            </div>
          )
        }
      />

      <div className="flex gap-7 border-b border-admin-divider">
        {(["machines", "pricing"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 border-b-2 pb-3 text-[15px] font-semibold transition-colors ${
              tab === t ? "border-admin-primary text-admin-primary" : "border-transparent text-admin-muted hover:text-admin-body"
            }`}
          >
            {t === "machines" ? "Printers & Machines" : "Price Detail"}
            {t === "machines" && (
              <span
                className={`rounded-admin-pill px-2 py-0.5 text-xs font-bold ${
                  tab === t ? "bg-admin-tint-strong text-admin-primary-deep" : "bg-admin-tint text-admin-muted"
                }`}
              >
                {machines?.length ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "machines" ? (
        machinesLoading ? (
          <EmptyState icon="print" title="Loading…" />
        ) : machines && machines.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {machines.map((m) => (
              <Card key={m.id} hoverable className="flex flex-col gap-4 p-5">
                <div className="flex items-start gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-admin-md bg-admin-tint-strong text-admin-primary">
                    <Icon name={m.category === "binding" ? "sell" : "print"} size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-admin-ink">{m.name}</p>
                    <p className="text-sm text-admin-muted">{m.model}</p>
                  </div>
                  <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status].toUpperCase()}</Badge>
                </div>
                {m.note && <p className="border-t border-admin-divider pt-3 text-sm text-admin-subtle">{m.note}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => openEditMachine(m)} className="text-sm font-semibold text-admin-primary hover:text-admin-primary-deep">
                    Edit
                  </button>
                  <button type="button" onClick={() => setMachineDeleteTarget(m)} className="text-sm font-semibold text-admin-danger hover:text-admin-danger">
                    Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon="print" title="No machines yet" description="Add a machine to start tracking status." />
        )
      ) : (
        <div className="flex flex-col gap-5">
          <Card hoverable={false} className="overflow-hidden p-0">
            <div className="border-b border-admin-divider px-5 py-4 text-[15px] font-bold text-admin-ink">Printing rate card</div>
            <DataTable
              columns={printRateColumns}
              rows={printRates ?? []}
              rowKey={(r) => r.id}
              isLoading={printLoading}
              emptyIcon="payments"
              emptyTitle="No rates set yet"
            />
          </Card>

          <Card hoverable={false} className="flex flex-col gap-0 overflow-hidden p-0">
            <div className="border-b border-admin-divider px-5 py-4 text-[15px] font-bold text-admin-ink">Binding & finishing</div>
            {finishingLoading ? null : finishingRates && finishingRates.length > 0 ? (
              finishingRates.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-4 border-t border-admin-divider px-5 py-3.5 transition-[transform,box-shadow,background-color] duration-150 first:border-t-0 hover:-translate-y-0.5 hover:bg-admin-tint hover:shadow-admin-row-hover-ring"
                >
                  <p className="flex-1 font-semibold text-admin-ink">{f.item_name}</p>
                  <p className="text-sm text-admin-muted">{f.note}</p>
                  <p className="font-bold text-admin-primary">{formatRupees(f.price)}</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => openEditFinishing(f)} className="text-sm font-semibold text-admin-primary hover:text-admin-primary-deep">
                      Edit
                    </button>
                    <button type="button" onClick={() => setFinishDeleteTarget(f)} className="text-sm font-semibold text-admin-danger hover:text-admin-danger">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon="content_cut" title="No finishing items yet" />
            )}
          </Card>
        </div>
      )}

      {/* Machine add/edit modal */}
      <Modal open={machineModalOpen} onClose={() => setMachineModalOpen(false)} title={machineEditTarget ? "Edit machine" : "Add machine"} widthClassName="max-w-xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Name">
              <Input value={machineForm.name} onChange={(e) => setMachineForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ricoh MP 5055" />
            </FormField>
            <FormField label="Model / location">
              <Input value={machineForm.model} onChange={(e) => setMachineForm((f) => ({ ...f, model: e.target.value }))} placeholder="e.g. Mono multifunction · Counter 1" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Category">
              <Select value={machineForm.category} onChange={(e) => setMachineForm((f) => ({ ...f, category: e.target.value as MachineCategory }))}>
                <option value="printer">Printer</option>
                <option value="binding">Binding / finishing</option>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={machineForm.status} onChange={(e) => setMachineForm((f) => ({ ...f, status: e.target.value as MachineStatus }))}>
                <option value="working">Working</option>
                <option value="under_repair">Under repair</option>
                <option value="maintenance">Maintenance</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Note">
            <Textarea rows={2} value={machineForm.note} onChange={(e) => setMachineForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Last serviced 28 Aug 2026" />
          </FormField>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setMachineModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={submitMachine} disabled={createMachine.isPending || updateMachine.isPending}>
              {machineEditTarget ? "Save changes" : "Add machine"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Log a fault modal */}
      <Modal open={faultModalOpen} onClose={() => setFaultModalOpen(false)} title="Log a fault" widthClassName="max-w-md">
        <div className="flex flex-col gap-4">
          <FormField label="Machine">
            <Select value={faultMachineId} onChange={(e) => setFaultMachineId(e.target.value)}>
              <option value="">Select a machine</option>
              {machines?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Fault description" hint="Marks the machine as Under repair.">
            <Textarea rows={3} value={faultNote} onChange={(e) => setFaultNote(e.target.value)} placeholder="e.g. Fuser unit failure, vendor visit expected 16 Sep" />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFaultModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={submitFault} disabled={updateMachine.isPending}>
              Log fault
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={machineDeleteTarget !== null} onClose={() => setMachineDeleteTarget(null)} title="Remove machine" widthClassName="max-w-md">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-admin-body">Remove &ldquo;{machineDeleteTarget?.name}&rdquo;? This can&apos;t be undone.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setMachineDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteMachine} disabled={deleteMachine.isPending}>
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* Print rate add/edit modal */}
      <Modal open={rateModalOpen} onClose={() => setRateModalOpen(false)} title={rateEditTarget ? "Edit rate" : "Add rate"} widthClassName="max-w-2xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Service">
              <Input value={rateForm.service} onChange={(e) => setRateForm((f) => ({ ...f, service: e.target.value }))} placeholder="e.g. Print · single side" />
            </FormField>
            <FormField label="Paper size">
              <Input value={rateForm.paper_size} onChange={(e) => setRateForm((f) => ({ ...f, paper_size: e.target.value }))} placeholder="A4" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="B&W price">
              <Input type="number" step="0.01" value={rateForm.bw_price} onChange={(e) => setRateForm((f) => ({ ...f, bw_price: e.target.value }))} />
            </FormField>
            <FormField label="Colour price">
              <Input type="number" step="0.01" value={rateForm.colour_price} onChange={(e) => setRateForm((f) => ({ ...f, colour_price: e.target.value }))} />
            </FormField>
            <FormField label="Bulk (50+) price">
              <Input type="number" step="0.01" value={rateForm.bulk_price} onChange={(e) => setRateForm((f) => ({ ...f, bulk_price: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="B&W unit">
              <Input value={rateForm.bw_unit} onChange={(e) => setRateForm((f) => ({ ...f, bw_unit: e.target.value }))} placeholder="page" />
            </FormField>
            <FormField label="Colour unit">
              <Input value={rateForm.colour_unit} onChange={(e) => setRateForm((f) => ({ ...f, colour_unit: e.target.value }))} placeholder="page" />
            </FormField>
            <FormField label="Bulk unit">
              <Input value={rateForm.bulk_unit} onChange={(e) => setRateForm((f) => ({ ...f, bulk_unit: e.target.value }))} placeholder="page" />
            </FormField>
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={submitRate} disabled={createPrintRate.isPending || updatePrintRate.isPending}>
              {rateEditTarget ? "Save changes" : "Add rate"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={rateDeleteTarget !== null} onClose={() => setRateDeleteTarget(null)} title="Delete rate" widthClassName="max-w-md">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-admin-body">Delete &ldquo;{rateDeleteTarget?.service}&rdquo;? This can&apos;t be undone.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRateDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteRate} disabled={deletePrintRate.isPending}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Finishing item add/edit modal */}
      <Modal open={finishModalOpen} onClose={() => setFinishModalOpen(false)} title={finishEditTarget ? "Edit item" : "Add finishing item"} widthClassName="max-w-md">
        <div className="flex flex-col gap-4">
          <FormField label="Item">
            <Input value={finishForm.item_name} onChange={(e) => setFinishForm((f) => ({ ...f, item_name: e.target.value }))} placeholder="e.g. Spiral binding" />
          </FormField>
          <FormField label="Note">
            <Input value={finishForm.note} onChange={(e) => setFinishForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. up to 200 pages" />
          </FormField>
          <FormField label="Price">
            <Input type="number" step="0.01" value={finishForm.price} onChange={(e) => setFinishForm((f) => ({ ...f, price: e.target.value }))} />
          </FormField>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFinishModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={submitFinishing} disabled={createFinishing.isPending || updateFinishing.isPending}>
              {finishEditTarget ? "Save changes" : "Add item"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={finishDeleteTarget !== null} onClose={() => setFinishDeleteTarget(null)} title="Delete item" widthClassName="max-w-md">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-admin-body">Delete &ldquo;{finishDeleteTarget?.item_name}&rdquo;? This can&apos;t be undone.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFinishDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteFinishing} disabled={deleteFinishing.isPending}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
