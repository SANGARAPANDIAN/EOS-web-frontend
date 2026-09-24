"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { friendlyError } from "@/lib/utils/errors";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  Badge,
  Button,
  DataTable,
  Dropdown,
  Input,
  KpiCard,
  NumberedPagination,
  PageHeader,
  Select,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  useProvisionableRoles,
  useStaffAccounts,
  useUpdateStaffAccountStatus,
  type StaffAccount,
} from "@/modules/admin/api/staffAccounts";
import { CreateStaffAccountDialog } from "@/modules/admin/components/staff-accounts/CreateStaffAccountDialog";
import { StaffAccountResetPasswordModal } from "@/modules/admin/components/staff-accounts/StaffAccountResetPasswordModal";

function roleLabel(name: string, description: string | null): string {
  if (description) return description;
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function displayName(row: StaffAccount): string {
  if (row.first_name) return `${row.first_name} ${row.last_name ?? ""}`.trim();
  return row.email;
}

export default function StaffAccountsPage() {
  const { show } = useToast();
  const { data: roles = [] } = useProvisionableRoles();
  const roleDescriptionByName = useMemo(() => new Map(roles.map((r) => [r.name, r.description])), [roles]);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffAccount | null>(null);

  const { data, isLoading, error } = useStaffAccounts({
    role_name: roleFilter || undefined,
    status: statusFilter || undefined,
    search: debouncedQuery || undefined,
    page,
    limit: pageSize,
  });
  const { data: activeData } = useStaffAccounts({ status: "active", limit: 1 });
  const { data: inactiveData } = useStaffAccounts({ status: "inactive", limit: 1 });

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const activeCount = activeData?.meta.total ?? 0;
  const inactiveCount = inactiveData?.meta.total ?? 0;

  const updateStatus = useUpdateStaffAccountStatus();

  function handleToggleStatus(row: StaffAccount) {
    const nextStatus = row.status === "active" ? "inactive" : "active";
    updateStatus.mutate(
      { id: row.id, status: nextStatus },
      {
        onSuccess: () => show(nextStatus === "active" ? "Account activated." : "Account deactivated.", "success"),
        onError: (err: unknown) => show(err instanceof ApiError ? err.message : friendlyError(err), "error"),
      },
    );
  }

  const columns: DataTableColumn<StaffAccount>[] = [
    {
      key: "name",
      header: "Name / Email",
      render: (row) => (
        <div>
          <div className="font-semibold text-admin-ink">{displayName(row)}</div>
          <div className="text-xs text-admin-muted">{row.email}</div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => roleLabel(row.role.name, roleDescriptionByName.get(row.role.name) ?? row.role.description),
    },
    {
      key: "department",
      header: "Department",
      render: (row) => row.department?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status === "active" ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Dropdown
          trigger={
            <button type="button" className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong" aria-label="Actions">
              <Icon name="more_vert" size={18} />
            </button>
          }
          items={[
            {
              key: "toggle-status",
              label: row.status === "active" ? "Deactivate" : "Activate",
              onSelect: () => handleToggleStatus(row),
            },
            {
              key: "reset-password",
              label: "Reset password",
              onSelect: () => setResetTarget(row),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Staff Accounts</span>
      </nav>

      <PageHeader
        title="Staff Accounts"
        description="Logins for every role without its own dedicated creation flow — Finance, Billing, Secretary, Librarian, Warden, HR, COE, and the rest. Faculty, Student, HoD, Parent, and Alumni each have their own screen elsewhere."
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Icon name="person_add" size={16} /> Add account
          </Button>
        }
      />

      <div className="mt-5 mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total accounts" value={(activeCount + inactiveCount).toLocaleString()} icon="badge" />
        <KpiCard label="Active" value={activeCount.toLocaleString()} icon="how_to_reg" />
        <KpiCard label="Inactive" value={inactiveCount.toLocaleString()} icon="person_off" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-sm flex-1">
          <Input
            leadingIcon="search"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-48">
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {roleLabel(r.name, r.description)}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "" | "active" | "inactive");
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load accounts." : null}
        emptyIcon="badge"
        emptyTitle="No accounts found"
        emptyDescription="Try a different search or filter, or add the first account for this role."
        footer={
          <NumberedPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      />

      <CreateStaffAccountDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {resetTarget && (
        <StaffAccountResetPasswordModal
          accountId={resetTarget.id}
          accountEmail={resetTarget.email}
          open={resetTarget !== null}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}
