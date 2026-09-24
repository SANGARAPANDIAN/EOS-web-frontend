"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useMyChildren, type MyChild } from "@/modules/parent/api/children";

interface ChildContextValue {
  children: MyChild[];
  isLoading: boolean;
  selectedChild: MyChild | null;
  selectedChildId: number | null;
  setSelectedChildId: (id: number) => void;
}

const ChildContext = createContext<ChildContextValue | null>(null);

/**
 * Holds which linked child a parent is currently viewing, shared across
 * every page under /parent so switching once (e.g. on the dashboard) stays
 * in effect on Attendance, Fees, Timetable, etc. Defaults to the first
 * child — most parent accounts here have exactly one; the switcher only
 * needs to render when `children.length > 1`.
 */
export function ChildProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const myChildren = useMyChildren();
  const [manualSelection, setManualSelection] = useState<number | null>(null);

  const children = useMemo(() => myChildren.data ?? [], [myChildren.data]);
  const selectedChildId = manualSelection ?? children[0]?.id ?? null;
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const value = useMemo<ChildContextValue>(
    () => ({
      children,
      isLoading: myChildren.isLoading,
      selectedChild,
      selectedChildId,
      setSelectedChildId: setManualSelection,
    }),
    [children, myChildren.isLoading, selectedChild, selectedChildId],
  );

  return <ChildContext.Provider value={value}>{reactChildren}</ChildContext.Provider>;
}

export function useSelectedChild(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useSelectedChild must be used within ChildProvider");
  return ctx;
}
