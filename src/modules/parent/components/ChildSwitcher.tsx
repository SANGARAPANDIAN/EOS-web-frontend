"use client";

import { Select } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";

/** Renders nothing for the common case (one linked child) — only shows a picker once there's actually more than one to switch between. */
export function ChildSwitcher() {
  const { children, selectedChildId, setSelectedChildId } = useSelectedChild();
  if (children.length <= 1) return null;

  return (
    <Select
      value={selectedChildId ?? ""}
      onChange={(e) => setSelectedChildId(Number(e.target.value))}
      className="w-auto min-w-[220px] font-bold"
    >
      {children.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} · {c.student_id_no}
        </option>
      ))}
    </Select>
  );
}
