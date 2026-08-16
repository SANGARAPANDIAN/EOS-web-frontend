"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { EmptyState, ProgressBar, SearchBar } from "@/components/ui";
import { useHostelRooms, useHostelRoomTypes, type HostelRoom } from "@/modules/hostel-warden/api/rooms";
import { useResidents } from "@/modules/hostel-warden/api/residents";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";

type Filter = "all" | "free" | "full" | "empty";

function roomState(r: HostelRoom): Filter {
  if (r.occupied === 0) return "empty";
  if (r.vacant === 0) return "full";
  return "free";
}

function RoomRosterModal({ room, typeName, onClose, onSelectStudent }: { room: HostelRoom; typeName: string; onClose: () => void; onSelectStudent: (id: number) => void }) {
  const residents = useResidents({ page_size: 100 });
  const occupants = (residents.data?.data ?? []).filter((r) => r.room?.id === room.id);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[420px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Room {room.room_number}</div>
            <div className="mt-0.5 text-[13px] text-muted">
              {typeName} · {room.occupied}/{room.capacity} beds filled
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-1 px-[26px] py-[18px]">
          {residents.isLoading ? (
            <div className="text-[13px] text-subtle">Loading…</div>
          ) : occupants.length === 0 ? (
            <div className="text-[13px] text-subtle">This room is currently empty.</div>
          ) : (
            occupants.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onSelectStudent(o.id)}
                className="flex items-center justify-between rounded-[9px] px-2 py-2.5 text-left hover:bg-surface-tint"
              >
                <span className="font-bold text-ink hover:text-primary hover:underline">{o.name}</span>
                <span className="font-mono text-[12px] text-subtle">{o.student_id_no}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function RoomsPage() {
  const rooms = useHostelRooms();
  const roomTypes = useHostelRoomTypes();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<HostelRoom | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const typeName = useMemo(() => {
    const map = new Map<number, string>();
    (roomTypes.data ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [roomTypes.data]);

  const rows = rooms.data ?? [];
  const totals = rows.reduce(
    (acc, r) => ({ rooms: acc.rooms + 1, beds: acc.beds + r.capacity, occupied: acc.occupied + r.occupied }),
    { rooms: 0, beds: 0, occupied: 0 },
  );
  const vacant = totals.beds - totals.occupied;
  const pct = totals.beds > 0 ? Math.round((totals.occupied / totals.beds) * 100) : 0;

  const counts = {
    all: rows.length,
    free: rows.filter((r) => roomState(r) === "free").length,
    full: rows.filter((r) => roomState(r) === "full").length,
    empty: rows.filter((r) => roomState(r) === "empty").length,
  };

  const filtered = rows.filter((r) => {
    if (filter !== "all" && roomState(r) !== filter) return false;
    if (search && !r.room_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const TILE_STYLE: Record<Filter, string> = {
    full: "border-primary bg-primary text-white",
    free: "border-border-accent bg-accent-50 text-primary-dark",
    empty: "border-border-default bg-surface text-body",
    all: "border-border-default bg-surface text-body",
  };

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Rooms &amp; allotment</h1>
        <p className="mt-1 text-[13px] text-muted">
          {totals.rooms} rooms · {totals.beds} beds · {vacant} beds vacant · tap a room to see who&apos;s in it.
        </p>
      </div>

      <div className="rounded-card border border-border-default bg-surface p-[18px_20px]">
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="font-bold text-ink">{pct}% occupied</span>
          <span className="text-muted">
            {totals.occupied} of {totals.beds} beds
          </span>
        </div>
        <ProgressBar percent={pct} height={7} className="mt-2" />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {[
          { key: "all" as const, label: "All rooms", count: counts.all },
          { key: "free" as const, label: "Has free beds", count: counts.free },
          { key: "full" as const, label: "Fully occupied", count: counts.full },
          { key: "empty" as const, label: "Empty rooms", count: counts.empty },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors ${
              filter === t.key ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft hover:bg-surface-tint"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
        <div className="flex-1" />
        <SearchBar className="w-[220px]" placeholder="Room number" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {rooms.isLoading ? (
        <EmptyState message="Loading…" />
      ) : filtered.length === 0 ? (
        <EmptyState message="No rooms match this filter." />
      ) : (
        <div className="grid grid-cols-6 gap-3">
          {filtered.map((r) => {
            const state = roomState(r);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoom(r)}
                className={`rounded-[10px] border p-3 text-left transition-transform hover:-translate-y-0.5 ${TILE_STYLE[state]}`}
              >
                <div className="font-mono text-[13px] font-bold">{r.room_number}</div>
                <div className={`mt-1 text-[12px] ${state === "full" ? "text-white/85" : "text-subtle"}`}>
                  {r.occupied}/{r.capacity} beds filled
                </div>
                <div className={`mt-0.5 text-[11px] ${state === "full" ? "text-white/70" : "text-subtle"}`}>{typeName.get(r.room_type_id) ?? "—"}</div>
              </button>
            );
          })}
        </div>
      )}

      {selectedRoom && (
        <RoomRosterModal
          room={selectedRoom}
          typeName={typeName.get(selectedRoom.room_type_id) ?? "—"}
          onClose={() => setSelectedRoom(null)}
          onSelectStudent={(id) => {
            setSelectedRoom(null);
            setSelectedStudentId(id);
          }}
        />
      )}
      {selectedStudentId != null && <StudentDetailModal studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />}
    </div>
  );
}
