"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, DataTable, Input, EmptyState, type DataTableColumn } from "@/components/ui";
import {
  useRoutes,
  useRouteDetail,
  useUpdateRoute,
  useUpdateStage,
  useCreateStage,
  useCreateRoute,
  useDeleteRoute,
  useRouteStudents,
  useAddRouteStudent,
  useRemoveRouteStudent,
  type Route,
  type RouteStage,
} from "@/modules/transport/api/routes";
import { formatTime12h } from "@/lib/utils/date";

function routeLabel(route: Route): string {
  const match = route.name.match(/^Route\s*(\d+)/i);
  const num = match ? Number(match[1]) : route.id;
  return `Route ${String(num).padStart(2, "0")}`;
}

interface StageForm {
  stage_name: string;
  fee_amount: string;
  pickup_time: string;
}

function toStageForm(stage: RouteStage): StageForm {
  return {
    stage_name: stage.stage_name,
    fee_amount: String(stage.fee_amount),
    pickup_time: stage.pickup_time ? stage.pickup_time.slice(0, 5) : "",
  };
}

function RouteStudentsSection({ routeId, stages }: { routeId: number; stages: RouteStage[] }) {
  const students = useRouteStudents(routeId);
  const addStudent = useAddRouteStudent(routeId);
  const removeStudent = useRemoveRouteStudent(routeId);

  const [studentIdNo, setStudentIdNo] = useState("");
  const [boardingStageId, setBoardingStageId] = useState<number | "">(stages[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (boardingStageId === "" && stages.length > 0) setBoardingStageId(stages[0].id);
  }, [stages, boardingStageId]);

  async function handleAdd() {
    if (!studentIdNo.trim() || boardingStageId === "") return;
    setError(null);
    try {
      await addStudent.mutateAsync({ student_id_no: studentIdNo.trim(), boarding_stage_id: Number(boardingStageId) });
      setStudentIdNo("");
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Could not add this student.";
      setError(message);
    }
  }

  async function handleRemove(mappingId: number) {
    setError(null);
    try {
      await removeStudent.mutateAsync(mappingId);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Could not remove this student.";
      setError(message);
    }
  }

  return (
    <div>
      <div className="mb-2.5 text-[13px] font-bold text-ink-soft">Students on this route</div>

      <div className="mb-3 grid grid-cols-[1.2fr_1fr_auto] gap-2.5 rounded-[11px] border border-border-default p-3">
        <Input
          placeholder="Student ID (e.g. 22CS001)"
          value={studentIdNo}
          onChange={(e) => setStudentIdNo(e.target.value)}
        />
        <select
          className="rounded-[9px] border border-border-default bg-surface px-3 text-[13px] text-body"
          value={boardingStageId}
          onChange={(e) => setBoardingStageId(e.target.value ? Number(e.target.value) : "")}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.stage_name}
            </option>
          ))}
        </select>
        <Button variant="primarySmall" onClick={handleAdd} disabled={addStudent.isPending || !studentIdNo.trim()}>
          Add
        </Button>
      </div>

      {error && <div className="mb-2 text-[12.5px] font-semibold text-danger-fg">{error}</div>}

      <div className="flex max-h-[220px] flex-col gap-1.5 overflow-auto">
        {students.isLoading && <EmptyState message="Loading students…" />}
        {students.data?.length === 0 && <EmptyState message="No students assigned to this route yet." />}
        {students.data?.map((s) => (
          <div key={s.mapping_id} className="grid grid-cols-[90px_1.3fr_1fr_auto_auto] items-center gap-2.5 rounded-[9px] border border-border-default px-3 py-2 text-[13px]">
            <span className="font-mono font-bold text-ink">{s.student_id_no}</span>
            <span className="truncate text-body">{s.student_name}</span>
            <span className="text-subtle">{s.boarding_stage_name}</span>
            <span className="font-semibold text-ink">₹{s.fee_amount.toLocaleString("en-IN")}</span>
            <button
              type="button"
              onClick={() => handleRemove(s.mapping_id)}
              disabled={removeStudent.isPending}
              className="text-[12px] font-bold text-danger-fg hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteEditModal({ routeId, onClose }: { routeId: number; onClose: () => void }) {
  const detail = useRouteDetail(routeId);
  const updateRoute = useUpdateRoute(routeId);
  const updateStage = useUpdateStage(routeId);
  const createStage = useCreateStage(routeId);

  const [routeForm, setRouteForm] = useState({ name: "", boarding_area: "", distance_km: "", departure_time: "", arrival_time: "" });
  const [stageForms, setStageForms] = useState<Record<number, StageForm>>({});
  const [newStage, setNewStage] = useState({ stage_name: "", fee_amount: "", pickup_time: "" });
  const [showNewStage, setShowNewStage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!detail.data) return;
    const r = detail.data.route;
    setRouteForm({
      name: r.name,
      boarding_area: r.boarding_area ?? "",
      distance_km: r.distance_km != null ? String(r.distance_km) : "",
      departure_time: r.departure_time ? r.departure_time.slice(0, 5) : "",
      arrival_time: r.arrival_time ? r.arrival_time.slice(0, 5) : "",
    });
    setStageForms(Object.fromEntries(detail.data.stages.map((s) => [s.id, toStageForm(s)])));
  }, [detail.data]);

  function setStageField(stageId: number, key: keyof StageForm, value: string) {
    setStageForms((f) => ({ ...f, [stageId]: { ...f[stageId], [key]: value } }));
  }

  async function submit() {
    if (!detail.data) return;
    setError(null);
    setSaving(true);
    try {
      const r = detail.data.route;
      const routeChanges: Record<string, unknown> = {};
      if (routeForm.name !== r.name) routeChanges.name = routeForm.name;
      if (routeForm.boarding_area !== (r.boarding_area ?? "")) routeChanges.boarding_area = routeForm.boarding_area;
      if (routeForm.distance_km !== (r.distance_km != null ? String(r.distance_km) : "") && routeForm.distance_km !== "")
        routeChanges.distance_km = Number(routeForm.distance_km);
      if (routeForm.departure_time && routeForm.departure_time !== (r.departure_time?.slice(0, 5) ?? ""))
        routeChanges.departure_time = routeForm.departure_time;
      if (routeForm.arrival_time && routeForm.arrival_time !== (r.arrival_time?.slice(0, 5) ?? ""))
        routeChanges.arrival_time = routeForm.arrival_time;

      const requests: Promise<unknown>[] = [];
      if (Object.keys(routeChanges).length > 0) requests.push(updateRoute.mutateAsync(routeChanges));

      for (const stage of detail.data.stages) {
        const form = stageForms[stage.id];
        if (!form) continue;
        const changes: Record<string, unknown> = {};
        if (form.stage_name !== stage.stage_name) changes.stage_name = form.stage_name;
        if (form.fee_amount !== String(stage.fee_amount) && form.fee_amount !== "") changes.fee_amount = Number(form.fee_amount);
        if (form.pickup_time && form.pickup_time !== (stage.pickup_time?.slice(0, 5) ?? "")) changes.pickup_time = form.pickup_time;
        if (Object.keys(changes).length > 0) requests.push(updateStage.mutateAsync({ stageId: stage.id, input: changes }));
      }

      await Promise.all(requests);
      onClose();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Could not save these changes.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function submitNewStage() {
    if (!newStage.stage_name.trim() || !newStage.fee_amount) return;
    setError(null);
    try {
      await createStage.mutateAsync({
        stage_name: newStage.stage_name.trim(),
        fee_amount: Number(newStage.fee_amount),
        pickup_time: newStage.pickup_time || undefined,
      });
      setNewStage({ stage_name: "", fee_amount: "", pickup_time: "" });
      setShowNewStage(false);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Could not add this stop.";
      setError(message);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="max-h-[88vh] w-full max-w-[760px] overflow-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Edit route</div>
            <div className="mt-0.5 text-[13px] text-muted">Transport office · route & stop fares</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body"
          >
            ✕
          </button>
        </div>

        {detail.isLoading || !detail.data ? (
          <div className="p-[26px]">
            <EmptyState message="Loading…" />
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-[26px] py-[24px]">
            <div>
              <div className="mb-2.5 text-[13px] font-bold text-ink-soft">Route</div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Name</label>
                  <Input className="mt-1.5" value={routeForm.name} onChange={(e) => setRouteForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Boarding area</label>
                  <Input
                    className="mt-1.5"
                    value={routeForm.boarding_area}
                    onChange={(e) => setRouteForm((f) => ({ ...f, boarding_area: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Distance (km)</label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    value={routeForm.distance_km}
                    onChange={(e) => setRouteForm((f) => ({ ...f, distance_km: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Departure time</label>
                  <Input
                    className="mt-1.5"
                    type="time"
                    value={routeForm.departure_time}
                    onChange={(e) => setRouteForm((f) => ({ ...f, departure_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Arrival time</label>
                  <Input
                    className="mt-1.5"
                    type="time"
                    value={routeForm.arrival_time}
                    onChange={(e) => setRouteForm((f) => ({ ...f, arrival_time: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <div className="text-[13px] font-bold text-ink-soft">Boarding stages & fares</div>
                <Button variant="text" onClick={() => setShowNewStage((v) => !v)}>
                  + Add stop
                </Button>
              </div>

              {showNewStage && (
                <div className="mb-3 grid grid-cols-4 gap-2.5 rounded-[11px] border border-border-default p-3">
                  <Input placeholder="Stop name" value={newStage.stage_name} onChange={(e) => setNewStage((f) => ({ ...f, stage_name: e.target.value }))} />
                  <Input
                    placeholder="Fee (₹)"
                    type="number"
                    value={newStage.fee_amount}
                    onChange={(e) => setNewStage((f) => ({ ...f, fee_amount: e.target.value }))}
                  />
                  <Input type="time" value={newStage.pickup_time} onChange={(e) => setNewStage((f) => ({ ...f, pickup_time: e.target.value }))} />
                  <Button variant="primarySmall" onClick={submitNewStage} disabled={createStage.isPending}>
                    Add
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {detail.data.stages.map((stage) => {
                  const form = stageForms[stage.id] ?? toStageForm(stage);
                  return (
                    <div key={stage.id} className="grid grid-cols-[28px_1.4fr_1fr_1fr] items-center gap-2.5">
                      <span className="font-mono text-[12px] text-subtle">{String(stage.sequence_no).padStart(2, "0")}</span>
                      <Input value={form.stage_name} onChange={(e) => setStageField(stage.id, "stage_name", e.target.value)} />
                      <Input
                        type="number"
                        value={form.fee_amount}
                        onChange={(e) => setStageField(stage.id, "fee_amount", e.target.value)}
                      />
                      <Input type="time" value={form.pickup_time} onChange={(e) => setStageField(stage.id, "pickup_time", e.target.value)} />
                    </div>
                  );
                })}
                {detail.data.stages.length === 0 && <EmptyState message="No boarding stages yet — add one above." />}
              </div>
            </div>

            {detail.data.stages.length > 0 && <RouteStudentsSection routeId={routeId} stages={detail.data.stages} />}
          </div>
        )}

        {error && <div className="px-[26px] pb-2 text-[13px] font-semibold text-danger-fg">{error}</div>}

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={saving || detail.isLoading}>
            Save changes
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function TransportRoutesPage() {
  const routes = useRoutes();
  const data = routes.data;
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteRoute = useDeleteRoute();

  async function handleDelete(route: Route) {
    setError(null);
    // The route is only removable once nothing points at it; the server
    // explains what is still attached, so that message is shown as-is.
    if (!window.confirm(`Delete ${routeLabel(route)}? This cannot be undone.`)) return;
    try {
      await deleteRoute.mutateAsync(route.id);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not delete this route.");
    }
  }

  const columns: DataTableColumn<Route>[] = [
    {
      key: "route",
      header: "Route",
      width: "170px",
      render: (route, i) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-pill border border-border-accent text-[12px] font-extrabold text-primary">
            {i + 1}
          </span>
          <span className="font-bold text-ink">{routeLabel(route)}</span>
        </div>
      ),
    },
    {
      key: "boarding",
      header: "Boarding area → campus",
      width: "1.3fr",
      render: (route) => (
        <span className="font-semibold text-ink">
          {route.boarding_area ?? route.name} <span className="text-subtle">→</span> College campus
        </span>
      ),
    },
    { key: "stops", header: "Stops", width: "0.55fr", render: (route) => route.stops_count },
    {
      key: "distance",
      header: "Distance",
      width: "0.75fr",
      render: (route) => (route.distance_km != null ? `${route.distance_km.toFixed(1)} km` : "—"),
    },
    {
      key: "window",
      header: "Pickup window",
      width: "1fr",
      render: (route) =>
        route.departure_time && route.arrival_time ? (
          <span className="font-mono text-[12.5px] text-body">
            {formatTime12h(route.departure_time.slice(0, 5))} – {formatTime12h(route.arrival_time.slice(0, 5))}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "fee",
      header: "Term fee",
      width: "0.9fr",
      render: (route) => {
        const { fee } = route;
        if (fee.per_student != null) {
          return (
            <div>
              <span className="font-bold">₹{fee.per_student.toLocaleString("en-IN")}</span>
              <div className="text-[11px] text-subtle">₹{fee.total_due.toLocaleString("en-IN")} total</div>
            </div>
          );
        }
        if (fee.range) {
          return (
            <div>
              <span className="font-bold">
                ₹{fee.range.min.toLocaleString("en-IN")}–₹{fee.range.max.toLocaleString("en-IN")}
              </span>
              <div className="text-[11px] text-subtle">varies by stop · ₹{fee.total_due.toLocaleString("en-IN")} total</div>
            </div>
          );
        }
        return <span className="text-subtle">No students yet</span>;
      },
    },
    {
      key: "buses",
      header: "Bus & driver",
      width: "1.3fr",
      render: (route) =>
        route.buses.length === 0 ? (
          <span className="text-subtle">No bus assigned</span>
        ) : (
          <div className="flex flex-col gap-1">
            {route.buses.map((bus) => (
              <div key={bus.bus_no} className="text-[13px]">
                <span className="font-mono">{bus.vehicle_number}</span>
                <span className="text-subtle"> · </span>
                <span>{bus.driver_name ?? "Unassigned"}</span>
              </div>
            ))}
          </div>
        ),
    },
    {
      key: "students",
      header: "Students",
      width: "0.6fr",
      align: "right",
      render: (route) => <span className="font-bold">{route.student_count}</span>,
    },
    {
      key: "edit",
      header: "",
      width: "130px",
      align: "right",
      render: (route) => (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingRouteId(route.id);
            }}
            className="text-[13px] font-bold text-primary hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete(route);
            }}
            disabled={deleteRoute.isPending}
            className="text-[13px] font-bold text-muted hover:text-danger-fg disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Routes</h1>
          <p className="mt-1 text-[13px] text-muted">Boarding areas, stops, timings and fares.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setCreating(true)}>
          Add route
        </Button>
      </div>

      {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

      {!data?.extended.specs && data && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint px-4 py-3 text-[12.5px] text-muted">
          Distance, boarding area and pickup window aren't tracked yet — those columns show "—" below.
        </div>
      )}

      {creating && <RouteCreateModal onClose={() => setCreating(false)} />}
      {editingRouteId != null && <RouteEditModal routeId={editingRouteId} onClose={() => setEditingRouteId(null)} />}

      <DataTable
        columns={columns}
        data={data?.routes ?? []}
        rowKey={(route) => route.id}
        emptyMessage={routes.isLoading ? "Loading…" : "No routes found."}
        hoverableRows
      />
    </div>
  );
}

/**
 * Creating a route only needs its name; the spec fields are optional because
 * not every deployment tracks them (the banner above says so when they are
 * absent). Stops and fares are added afterwards from Edit, which is where the
 * stage editor already lives.
 */
function RouteCreateModal({ onClose }: { onClose: () => void }) {
  const createRoute = useCreateRoute();
  const [form, setForm] = useState({
    name: "",
    boarding_area: "",
    distance_km: "",
    departure_time: "",
    arrival_time: "",
  });
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim()) {
      setError("Give the route a name.");
      return;
    }
    setError(null);
    try {
      await createRoute.mutateAsync({
        name: form.name.trim(),
        boarding_area: form.boarding_area.trim() || undefined,
        distance_km: form.distance_km ? Number(form.distance_km) : undefined,
        departure_time: form.departure_time || undefined,
        arrival_time: form.arrival_time || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not create this route.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[460px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">Add route</div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Route name</label>
            <Input className="mt-1.5" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Route 12 — Gandhipuram" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Boarding area</label>
            <Input className="mt-1.5" value={form.boarding_area} onChange={(e) => set("boarding_area", e.target.value)} placeholder="Gandhipuram" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Distance (km)</label>
            <Input className="mt-1.5" type="number" step="0.1" min="0" value={form.distance_km} onChange={(e) => set("distance_km", e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Departure</label>
              <Input className="mt-1.5" type="time" value={form.departure_time} onChange={(e) => set("departure_time", e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Arrival</label>
              <Input className="mt-1.5" type="time" value={form.arrival_time} onChange={(e) => set("arrival_time", e.target.value)} />
            </div>
          </div>
          <p className="text-[12px] text-subtle">Add the stops and their fares from Edit once the route exists.</p>
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={createRoute.isPending}>
            {createRoute.isPending ? "Creating…" : "Create route"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
