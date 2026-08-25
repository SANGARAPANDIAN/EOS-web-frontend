"use client";

import { useEffect, useRef } from "react";
import {
  useNotificationsPanel,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  usePinNotification,
  useUnpinNotification,
  type NotificationRow,
} from "@/modules/shared/api/notifications";

// Bell-icon dropdown — pinned rows always shown first, everything else
// unread-only (see useNotificationsPanel / GET /me/notifications/panel).
// Clicking a row marks it read (removing it from this list, unless pinned —
// a pinned row only clears once it's explicitly unpinned-and-read or clicked
// directly, per spec: viewing/pinned state never auto-disappears on its own).

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationRowItem({ row }: { row: NotificationRow }) {
  const markRead = useMarkNotificationRead();
  const pin = usePinNotification();
  const unpin = useUnpinNotification();

  return (
    <div
      onClick={() => !markRead.isPending && markRead.mutate(row.id)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 14px",
        borderBottom: "1px solid #F1F5F9",
        cursor: "pointer",
        background: row.is_pinned ? "#F8FAFC" : "transparent",
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: row.is_read ? "transparent" : "#1D4ED8",
          marginTop: 6,
          flex: "0 0 7px",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0F172A", lineHeight: 1.4 }}>{row.message}</div>
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>{timeAgo(row.created_at)}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (row.is_pinned) unpin.mutate(row.id);
          else pin.mutate(row.id);
        }}
        title={row.is_pinned ? "Unpin" : "Pin"}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: row.is_pinned ? "#1D4ED8" : "#CBD5E1",
          fontSize: 14,
          padding: 2,
          flex: "0 0 auto",
        }}
      >
        📌
      </button>
    </div>
  );
}

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const panel = useNotificationsPanel();
  const markAllRead = useMarkAllNotificationsRead();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const rows = panel.data ?? [];

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 46,
        right: 0,
        width: 360,
        maxHeight: 440,
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>Notifications</div>
        <button
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || rows.every((r) => r.is_read)}
          style={{
            border: "none",
            background: "transparent",
            color: "#1D4ED8",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Mark all read
        </button>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {panel.isLoading && <div style={{ padding: 20, fontSize: 12.5, color: "#94A3B8" }}>Loading…</div>}
        {!panel.isLoading && rows.length === 0 && (
          <div style={{ padding: 20, fontSize: 12.5, color: "#94A3B8" }}>You&apos;re all caught up.</div>
        )}
        {rows.map((row) => (
          <NotificationRowItem key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}
