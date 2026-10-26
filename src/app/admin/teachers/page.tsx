"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import BanToggle from "@/components/dashboard/BanToggle";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { Avatar, FilterSelect, PageHeader, SearchInput, StatusBadge } from "@/components/ui/primitives";
import { withQuery } from "@/lib/api";
import type { AdminTeacherRow, Paginated } from "@/lib/api-types";
import { formatBDT, formatDate } from "@/lib/format";
import { btn } from "@/lib/ui";
import { useApi, useDebounced } from "@/lib/use-api";

export default function AdminTeachersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim());
  // q matches the name or the Teacher ID
  const list = useApi<Paginated<AdminTeacherRow>>(withQuery("/admin/teachers", { status, q, page, limit: 10 }));
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Teachers" description="Approved teachers and their earnings. Banning a teacher hides their courses." />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={filter(setQuery)} placeholder="Search by name or Teacher ID" className="flex-1" />
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
        <DataTable<AdminTeacherRow>
          rows={list.data.data}
          rowKey={(t) => t.id}
          emptyTitle="No teachers found"
          serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
          columns={[
            {
              header: "Teacher",
              cell: (t) => (
                <div className="flex items-center gap-3 min-w-[200px]">
                  <Avatar name={t.name} src={t.avatar} size="w-9 h-9" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{t.teacherCode}</p>
                  </div>
                </div>
              ),
            },
            { header: "Courses", cell: (t) => `${t.liveCourses} live / ${t.totalCourses}` },
            { header: "Gross sales", cell: (t) => formatBDT(t.gross) },
            { header: "Net earnings", cell: (t) => formatBDT(t.net) },
            { header: "Withdrawable", cell: (t) => formatBDT(t.withdrawable) },
            { header: "Joined", cell: (t) => <span className="whitespace-nowrap">{formatDate(t.joinedAt)}</span> },
            { header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
            {
              header: "Actions",
              className: "text-right",
              cell: (t) => (
                <div className="flex justify-end gap-1">
                  <Link href={`/teachers/${t.id}`} className={btn.small}>
                    <Eye size={14} /> Profile
                  </Link>
                  <BanToggle
                    user={{ id: t.userId, name: t.name, role: "teacher", status: t.status }}
                    onChange={(next) =>
                      list.setData((prev) => ({
                        ...prev!,
                        data: prev!.data.map((row) => (row.id === t.id ? { ...row, status: next } : row)),
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
