"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useBatches } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import type { Batch } from "@/modules/academic-structure/types";

const STORAGE_KEY = "eos.academic-coordinator.selectedBatchId";

interface AcademicYearContextValue {
  batchId: number | null;
  setBatchId: (id: number) => void;
  batches: Batch[];
  selectedBatch: Batch | null;
}

const AcademicYearContext = createContext<AcademicYearContextValue | null>(null);

/**
 * The one real, stable "which cohort am I looking at" identifier every page
 * already keys off (classes.batch_id) — this just makes picking it a single
 * global action instead of something every page re-derives on its own.
 * Persisted to localStorage so it survives navigation/refresh.
 */
export function AcademicYearProvider({ children }: { children: React.ReactNode }) {
  const batches = useBatches();
  const [storedBatchId, setStoredBatchId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  });

  function setBatchId(id: number) {
    setStoredBatchId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(id));
  }

  // Default to the batch closest to graduating (earliest end_year) — the most
  // operationally relevant one for a coordinator — until the user picks one.
  const defaultBatchId = useMemo(() => {
    if (!batches.data || batches.data.length === 0) return null;
    return [...batches.data].sort((a, b) => a.end_year - b.end_year)[0].id;
  }, [batches.data]);

  const effectiveBatchId = storedBatchId != null && batches.data?.some((b) => b.id === storedBatchId) ? storedBatchId : defaultBatchId;
  const selectedBatch = (batches.data ?? []).find((b) => b.id === effectiveBatchId) ?? null;

  const value: AcademicYearContextValue = {
    batchId: effectiveBatchId,
    setBatchId,
    batches: batches.data ?? [],
    selectedBatch,
  };

  return <AcademicYearContext.Provider value={value}>{children}</AcademicYearContext.Provider>;
}

export function useAcademicYear(): AcademicYearContextValue {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error("useAcademicYear must be used within AcademicYearProvider");
  return ctx;
}
