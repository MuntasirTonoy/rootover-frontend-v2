"use client";

import { useState } from "react";
import BanToggle from "@/components/dashboard/BanToggle";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { Avatar, FilterSelect, PageHeader, SearchInput, StatusBadge } from "@/components/ui/primitives";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { api, errorMessage, withQuery } from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { btn } from "@/lib/ui";
import type { AdminStudentRow, Paginated } from "@/lib/api-types";
import { formatBDT, formatDate } from "@/lib/format";
import { useApi, useDebounced } from "@/lib/use-api";

export default function AdminStudentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim());
  // Newest accounts first; q matches the name or email
  const list = useApi<Paginated<AdminStudentRow>>(withQuery("/admin/students", { status, q, page, limit: 10 }));
  // An admin is no longer a student, so the list is reloaded afterwards
  const makeAdmin = async (u: AdminStudentRow) => {
    const ok = await confirmAction({
      title: `Make ${u.name} an admin?`,
      text: "They get full access to the admin area (and are signed out once to pick it up). You can remove the role later from Admins.",
      confirmText: "Make admin",
    });
    if (!ok) return;
    try {
      await api(`/admin/users/${u.id}/role`, { method: "PATCH", body: { role: "admin" } });
      toast.success(`${u.name} is now an admin`);
      list.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Students" description="Student accounts, their enrollments and spending." />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={filter(setQuery)} placeholder="Search by name or email" className="flex-1" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={filter(setStatus)}
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "banned", label: "Banned" },
          ]}
        />
      </div>
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<AdminStudentRow>
          rows={list.data.data}
          rowKey={(u) => u.id}
          emptyTitle="No students found"
          serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
          columns={[
            {
              header: "Student",
              cell: (u) => (
                <div className="flex items-center gap-3 min-w-[200px]">
                  <Avatar name={u.name} src={u.avatar} size="w-9 h-9" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
              ),
            },
            { header: "Enrolled", cell: (u) => u.enrolled },
            { header: "Total spent", cell: (u) => formatBDT(u.totalSpent) },
            { header: "Joined", cell: (u) => <span className="whitespace-nowrap">{formatDate(u.createdAt)}</span> },
            { header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
            {
              header: "Actions",
              className: "text-right",
              cell: (u) => (
                <div className="flex justify-end gap-1">
                  {u.status === "active" && (
                    <button onClick={() => makeAdmin(u)} className={btn.small}>
                      <ShieldCheck size={14} /> Make admin
                    </button>
                  )}
                  <BanToggle
                    user={u}
                    onChange={(next) =>
                      list.setData((prev) => ({
                        ...prev!,
                        data: prev!.data.map((row) => (row.id === u.id ? { ...row, status: next } : row)),
                      }))
                    }
                  />
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
