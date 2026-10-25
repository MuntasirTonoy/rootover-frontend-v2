"use client";

import { useState } from "react";
import BanToggle from "@/components/dashboard/BanToggle";
import DataTable from "@/components/ui/DataTable";
import { Avatar, FilterSelect, PageHeader, SearchInput, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatBDT, formatDate } from "@/lib/format";
import { latestApplication, studentsOf } from "@/lib/selectors";
import type { User } from "@/lib/types";

export default function AdminStudentsPage() {
  const { db } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const q = query.trim().toLowerCase();
  const rows = studentsOf(db).filter(
    (u) => (!status || u.status === status) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
  );

  return (
    <div>
      <PageHeader title="Students" description="Student accounts, their enrollments and spending." />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or email" className="flex-1" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "banned", label: "Banned" },
          ]}
        />
      </div>
      <DataTable<User>
        rows={rows}
        rowKey={(u) => u.id}
        emptyTitle="No students found"
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
          { header: "Enrolled", cell: (u) => db.enrollments.filter((e) => e.studentId === u.id).length },
          {
            header: "Total spent",
            cell: (u) =>
              formatBDT(db.purchases.filter((p) => p.studentId === u.id && p.status === "completed").reduce((s, p) => s + p.amountPaid, 0)),
          },
          {
            header: "Teacher application",
            cell: (u) => {
              const app = latestApplication(db, u.id);
              return app ? <StatusBadge status={app.status} /> : <span className="text-xs text-muted-foreground">—</span>;
            },
          },
          { header: "Joined", cell: (u) => <span className="whitespace-nowrap">{formatDate(u.createdAt)}</span> },
          { header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
          { header: "Actions", className: "text-right", cell: (u) => <div className="flex justify-end"><BanToggle user={u} /></div> },
        ]}
      />
    </div>
  );
}
