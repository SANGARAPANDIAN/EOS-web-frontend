"use client";

// Real-data pass of the `isItems` sc-if block from
// "Billing Module - Web/Billing Admin.dc.html" (lines 1315-1342).
//
// GAP: a real fee_structure_items row has no per-item "concession"/"net"
// column — concessions live on the parent fee_structure (see the
// Concessions page), not on individual items — so those two design
// columns are dropped and replaced with an "Item" column identifying
// which demand category / hostel room type / transport stage the row is
// (whichever one the parent structure's applies_to selects).
//
// Create: POST /fee-structures/:feeStructureId/items with exactly one of
// demand_category_id/hostel_room_type_id/transport_stage_id (whichever the
// selected structure's applies_to picks) + amount. Amount auto-fills from
// the source's own fee for hostel/transport (still editable), no auto-fill
// for demand-category (old-frontend-exact). Edit: PUT
// /fee-structure-items/:id — feeStructureId not editable/sendable on edit.

import { useEffect, useState } from "react";
import { PageHeader, tableWrapSx, thSx, thRightSx, tdSx, monoSx } from "@/modules/billing/PageHeader";
import { BillingModal, fieldLabelSx, fieldInputSx } from "@/modules/billing/BillingModal";
import { money } from "@/modules/billing/fakeData";
import {
  useFeeStructures,
  useDemandCategories,
  useHostelRoomTypes,
  useTransportStages,
  useCreateFeeStructureItem,
  useUpdateFeeStructureItem,
  useDeleteFeeStructureItem,
  type FeeStructureItemRow,
} from "@/modules/billing/api/fees";

export default function ItemsPage() {
  const { data: structures } = useFeeStructures();
  const { data: demandCategories } = useDemandCategories();
  const { data: hostelRoomTypes } = useHostelRoomTypes();
  const { data: transportStages } = useTransportStages();
  const createItem = useCreateFeeStructureItem();
  const updateItem = useUpdateFeeStructureItem();
  const deleteItem = useDeleteFeeStructureItem();
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const rows = (structures ?? []).flatMap((s) =>
    s.fee_structure_items.map((it) => {
      const itemName =
        it.demand_category_id != null
          ? demandCategories?.find((c) => c.id === it.demand_category_id)?.name
          : it.hostel_room_type_id != null
            ? hostelRoomTypes?.find((c) => c.id === it.hostel_room_type_id)?.name
            : transportStages?.find((c) => c.id === it.transport_stage_id)?.stage_name;
      return { ...it, structureName: s.name, itemName: itemName ?? "—" };
    }),
  );

  // ---- Add/Edit modal state ----
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeeStructureItemRow | null>(null);
  const [formStructureId, setFormStructureId] = useState<string>("");
  const [formDemandCategory, setFormDemandCategory] = useState<string>("");
  const [formHostelRoomType, setFormHostelRoomType] = useState<string>("");
  const [formTransportStage, setFormTransportStage] = useState<string>("");
  const [formAmount, setFormAmount] = useState("");

  const selectedStructure = (structures ?? []).find((s) => String(s.id) === formStructureId);
  const appliesTo = selectedStructure?.applies_to;

  useEffect(() => {
    // Auto-fill amount from the source's own fee for hostel/transport, no
    // auto-fill for demand-category (old-frontend-exact) — only while
    // creating, and only when the source selection changes.
    if (editing) return;
    if (appliesTo === "hostel" && formHostelRoomType) {
      const rt = hostelRoomTypes?.find((r) => String(r.id) === formHostelRoomType);
      if (rt?.fee_amount != null) setFormAmount(String(rt.fee_amount));
    } else if (appliesTo === "transport" && formTransportStage) {
      const st = transportStages?.find((s) => String(s.id) === formTransportStage);
      if (st?.fee_amount != null) setFormAmount(String(st.fee_amount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formHostelRoomType, formTransportStage, appliesTo]);

  function openAdd() {
    setEditing(null);
    setFormStructureId(structures?.[0] ? String(structures[0].id) : "");
    setFormDemandCategory("");
    setFormHostelRoomType("");
    setFormTransportStage("");
    setFormAmount("");
    setModalOpen(true);
  }

  function openEdit(row: FeeStructureItemRow) {
    setEditing(row);
    setFormStructureId(String(row.fee_structure_id));
    setFormDemandCategory(row.demand_category_id != null ? String(row.demand_category_id) : "");
    setFormHostelRoomType(row.hostel_room_type_id != null ? String(row.hostel_room_type_id) : "");
    setFormTransportStage(row.transport_stage_id != null ? String(row.transport_stage_id) : "");
    setFormAmount(String(row.amount));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function submitModal() {
    const amount = Number(formAmount);
    if (!formStructureId || !amount) {
      showToast("Please choose a fee structure and enter an amount");
      return;
    }
    if (
      (appliesTo === "hostel" && !formHostelRoomType) ||
      (appliesTo === "transport" && !formTransportStage) ||
      (appliesTo === "quota" && !formDemandCategory)
    ) {
      showToast("Please choose an item source");
      return;
    }
    if (editing) {
      updateItem.mutate(
        { id: editing.id, amount },
        {
          onSuccess: () => {
            closeModal();
            showToast("Item updated");
          },
          onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not update this item"),
        },
      );
      return;
    }
    const input =
      appliesTo === "hostel"
        ? { hostel_room_type_id: Number(formHostelRoomType), amount }
        : appliesTo === "transport"
          ? { transport_stage_id: Number(formTransportStage), amount }
          : { demand_category_id: Number(formDemandCategory), amount };
    createItem.mutate(
      { feeStructureId: Number(formStructureId), input },
      {
        onSuccess: () => {
          closeModal();
          showToast("Item added");
        },
        onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not add this item"),
      },
    );
  }

  return (
    <div>
      <PageHeader title="Fee Structure Items" sub="Line items that make up each fee structure" actionLabel="Add item" onAction={openAdd} />

      <div style={tableWrapSx}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
              <th style={thSx}>Fee Structure</th>
              <th style={thSx}>Item</th>
              <th style={thRightSx}>Amount</th>
              <th style={thRightSx}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} data-bill-rowtable style={{ borderTop: "1px solid #f1f5f9", transition: "transform .15s ease,box-shadow .15s ease", position: "relative" }}>
                <td style={{ ...tdSx, fontWeight: 600 }}>{i.structureName}</td>
                <td style={{ padding: "13px 10px", fontSize: 13 }}>{i.itemName}</td>
                <td style={{ padding: "13px 10px", textAlign: "right", ...monoSx, fontSize: 13 }}>{money(Number(i.amount))}</td>
                <td style={{ padding: "13px 18px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      data-bill-icon
                      onClick={() => openEdit(i)}
                      style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f2d6b" }}
                    >
                      Edit
                    </button>
                    <button
                      data-bill-icon
                      onClick={() =>
                        deleteItem.mutate(i.id, {
                          onSuccess: () => showToast(`Item removed from ${i.structureName}`),
                          onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not remove this item"),
                        })
                      }
                      style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f2d6b" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 46, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>No fee structure items yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <BillingModal
        open={modalOpen}
        title={editing ? "Edit Fee Structure Item" : "Add Fee Structure Item"}
        sub={editing ? "Update this item's amount" : "Add a line item to an existing fee structure"}
        cta={editing ? "Save Changes" : "Add Item"}
        onClose={closeModal}
        onSubmit={submitModal}
      >
        <div>
          <div style={fieldLabelSx}>Fee Structure</div>
          <select
            value={formStructureId}
            disabled={editing !== null}
            onChange={(e) => {
              setFormStructureId(e.target.value);
              setFormDemandCategory("");
              setFormHostelRoomType("");
              setFormTransportStage("");
              setFormAmount("");
            }}
            style={{ ...fieldInputSx, background: editing ? "#f8fafc" : "#fff", color: editing ? "#94a3b8" : undefined }}
          >
            <option value="">Select a fee structure</option>
            {(structures ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {!editing && appliesTo === "quota" && (
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

        {!editing && appliesTo === "hostel" && (
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

        {!editing && appliesTo === "transport" && (
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

        <div>
          <div style={fieldLabelSx}>Amount</div>
          <input value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="e.g. 60000" style={fieldInputSx} />
        </div>
      </BillingModal>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, boxShadow: "0 10px 24px rgba(15,23,42,.25)", zIndex: 80 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
