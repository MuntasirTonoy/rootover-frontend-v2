"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import BanToggle from "@/components/dashboard/BanToggle";
import DataTable from "@/components/ui/DataTable";
import { Avatar, FilterSelect, PageHeader, SearchInput, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatBDT, formatDate } from "@/lib/format";
import { getUser, teacherFinance, type TeacherWithUser, teacherInfo } from "@/lib/selectors";
import { btn } from "@/lib/ui";

export default function AdminTeachersPage() {
  const { db } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const q = query.trim().toLowerCase();
  const rows = db.teachers
    .map((t) => teacherInfo(db, t.id)!)
    .filter((t) => (!status || t.status === status) && (!q || t.name.toLowerCase().includes(q) || t.teacherCode.toLowerCase().includes(q)));

  return (
    <div>
      <PageHeader title="Teachers" description="Approved teachers and their earnings. Banning a teacher hides their courses." />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or Teacher ID" className="flex-1" />
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
      <DataTable<TeacherWithUser>
        rows={rows}
        rowKey={(t) => t.id}
        emptyTitle="No teachers found"
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
          {
            header: "Courses",
            cell: (t) => {
              const mine = db.courses.filter((c) => c.teacherId === t.id);
              return `${mine.filter((c) => c.status === "approved").length} live / ${mine.length}`;
            },
          },
          { header: "Gross sales", cell: (t) => formatBDT(teacherFinance(db, t.id).gross) },
          { header: "Net earnings", cell: (t) => formatBDT(teacherFinance(db, t.id).teacherNet) },
          { header: "Withdrawable", cell: (t) => formatBDT(teacherFinance(db, t.id).withdrawable) },
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
                <BanToggle user={getUser(db, t.userId)!} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
