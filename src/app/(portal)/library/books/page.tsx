"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import {
  PageHeader,
  Button,
  Input,
  DataTable,
  NumberedPagination,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useBooks, useDeleteBook, type Book } from "@/modules/library/api/books";
import { BookFormModal } from "@/modules/library/components/books/BookFormModal";
import { BookFilters, type BookFiltersValue } from "@/modules/library/components/books/BookFilters";

const DEFAULT_PAGE_SIZE = 20;

export default function BooksPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [filters, setFilters] = useState<BookFiltersValue>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [formTarget, setFormTarget] = useState<Book | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const { show } = useToast();

  const { data, isLoading, error } = useBooks({
    q: debouncedQuery || undefined,
    ...filters,
    page,
    page_size: pageSize,
  });
  const deleteBook = useDeleteBook();

  const columns: DataTableColumn<Book>[] = [
    {
      key: "title",
      header: "Book",
      render: (row) => (
        <div>
          <p className="font-semibold text-admin-ink">{row.title}</p>
          <p className="text-xs text-admin-muted">{row.author ?? "Unknown author"}</p>
        </div>
      ),
    },
    {
      key: "qr_code",
      header: "ISBN / accession",
      render: (row) => (
        <div>
          <p className="font-mono text-admin-body">{row.qr_code}</p>
          {row.isbn && <p className="text-xs text-admin-muted">{row.isbn}</p>}
        </div>
      ),
    },
    { key: "category_name", header: "Category", render: (row) => row.category_name },
    { key: "department", header: "Department", render: (row) => row.department?.name ?? "—" },
    { key: "rack", header: "Rack", render: (row) => row.rack?.rack_code ?? "—" },
    {
      key: "copies",
      header: "Copies",
      render: (row) => `${row.available_copies} / ${row.total_copies}`,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setFormTarget(row)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-body"
            aria-label={`Edit ${row.title}`}
          >
            <Icon name="edit" size={17} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-danger-bg hover:text-admin-danger"
            aria-label={`Delete ${row.title}`}
          >
            <Icon name="delete" size={17} />
          </button>
        </div>
      ),
    },
  ];

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteBook.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Book deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/library/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Books</span>
      </nav>

      <PageHeader
        title="Books"
        description="Every physical title with its live copy position."
        actions={
          <Button variant="primary" onClick={() => setFormTarget("new")}>
            <Icon name="add" size={16} /> Add book
          </Button>
        }
      />

      <div className="mt-5 mb-4 max-w-sm">
        <Input
          leadingIcon="search"
          placeholder="Title, author, ISBN, accession or publisher"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="mb-4">
        <BookFilters
          value={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load books." : null}
        emptyTitle="No books found"
        footer={
          data && (
            <NumberedPagination
              page={data.page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )
        }
      />

      <BookFormModal
        open={formTarget !== null}
        book={formTarget === "new" ? null : formTarget}
        onClose={() => setFormTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete book"
        message={`Delete "${deleteTarget?.title}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteBook.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
