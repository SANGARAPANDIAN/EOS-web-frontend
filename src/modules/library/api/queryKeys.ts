function resourceKeys(all: readonly unknown[]) {
  return {
    all: () => all,
    list: (params: object = {}) => [...all, "list", params] as const,
    detail: (id: number | string) => [...all, "detail", id] as const,
    search: (q: string) => [...all, "search", q] as const,
  };
}

const base = ["library"] as const;

export const libraryKeys = {
  all: base,
  dashboard: () => [...base, "dashboard"] as const,
  books: resourceKeys([...base, "books"]),
  eResources: resourceKeys([...base, "e-resources"]),
  categories: resourceKeys([...base, "categories"]),
  racks: resourceKeys([...base, "racks"]),
  borrowRecords: resourceKeys([...base, "borrow-records"]),
  members: resourceKeys([...base, "members"]),
  students: {
    search: (q: string) => [...base, "students", "search", q] as const,
    noDues: (id: number) => [...base, "students", "no-dues", id] as const,
  },
  settings: () => [...base, "settings"] as const,
  reports: {
    preview: (key: string, filters: object = {}) => [...base, "reports", key, filters] as const,
  },
};
