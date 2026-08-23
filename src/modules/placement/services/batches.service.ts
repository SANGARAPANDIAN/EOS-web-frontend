import { apiClient } from "@/lib/api/client";
import type { Batch } from "../types";

interface BackendBatch {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

function toBatch(b: BackendBatch): Batch {
  return { id: b.id, name: b.name, startYear: b.start_year, endYear: b.end_year };
}

export const batchesService = {
  async list(): Promise<Batch[]> {
    const rows = await apiClient.get<BackendBatch[]>("/drives/batches");
    return rows.map(toBatch);
  },
};
