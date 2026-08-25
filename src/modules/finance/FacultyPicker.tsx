"use client";

import { useState } from "react";
import { useFacultySearch, type FacultyOption } from "./api/finance";
import { BLUE, GREY } from "./ui";
import { FinanceIcon } from "./icons";
import { fieldLabelSx, fieldInputSx } from "./FinanceModal";

// Faculty search + select, shared by the approval modal (nominating who an
// order is for) and the allotment dialog (recording actual custody). One
// component so both places search the same real endpoint and look identical.

export function FacultyPicker({
  label = "Faculty member",
  required = false,
  disabled = false,
  selectedId,
  selectedLabel,
  onSelect,
  hint,
}: {
  label?: string;
  required?: boolean;
  disabled?: boolean;
  selectedId: number | null;
  /** Shown when a selection was made outside this picker (e.g. pre-filled). */
  selectedLabel?: string | null;
  onSelect: (faculty: FacultyOption | null) => void;
  hint?: string;
}) {
  const [query, setQuery] = useState("");
  const { data: results, isFetching } = useFacultySearch(query);

  return (
    <div>
      <div style={fieldLabelSx}>
        {label} {required && <span style={{ color: BLUE.primary }}>*</span>}
      </div>

      {/* A confirmed selection collapses the list, so the modal does not stay
          cluttered once the choice is made. */}
      {selectedId !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: BLUE.soft,
            border: `1px solid ${BLUE.line}`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 8,
          }}
        >
          <span style={{ width: 28, height: 28, borderRadius: 8, background: BLUE.strong, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 28px" }}>
            <FinanceIcon name="faculty" size={14} />
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.6, fontWeight: 600, color: BLUE.strong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedLabel ?? "Selected"}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={() => { onSelect(null); setQuery(""); }}
              style={{ background: "transparent", border: 0, color: BLUE.primary, fontSize: 11.3, fontWeight: 600, cursor: "pointer" }}
            >
              Change
            </button>
          )}
        </div>
      )}

      {selectedId === null && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, staff code or email…"
            style={fieldInputSx}
            disabled={disabled}
          />
          <div style={{ maxHeight: 190, overflowY: "auto", border: `1px solid ${GREY.hair}`, borderRadius: 10, marginTop: 8 }}>
            {isFetching && (results ?? []).length === 0 && (
              <div style={{ padding: "11px 13px", fontSize: 12.2, color: GREY.faint }}>Searching…</div>
            )}
            {!isFetching && (results ?? []).length === 0 && (
              <div style={{ padding: "11px 13px", fontSize: 12.2, color: GREY.faint }}>
                {query ? "No matching faculty." : "Start typing to search faculty."}
              </div>
            )}
            {(results ?? []).map((f) => (
              <button
                key={f.id}
                type="button"
                data-fin-row=""
                onClick={() => onSelect(f)}
                disabled={disabled}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 13px",
                  border: 0,
                  borderBottom: `1px solid ${GREY.rule}`,
                  background: "#fff",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 8, background: GREY.hair, color: GREY.muted, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 28px" }}>
                  <FinanceIcon name="faculty" size={14} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 12.6, fontWeight: 600, color: BLUE.ink }}>{f.name}</span>
                  <span style={{ display: "block", fontSize: 11.3, color: GREY.muted, marginTop: 1 }}>
                    {f.designation ?? "—"}
                    {f.department ? ` · ${f.department}` : ""}
                    {f.staff_code ? ` · ${f.staff_code}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {hint && <div style={{ fontSize: 11.3, color: GREY.muted, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
