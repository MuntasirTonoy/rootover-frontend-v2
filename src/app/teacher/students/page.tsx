"use client";

import { useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { Avatar, FilterSelect, PageHeader, SearchInput, StatCard } from "@/components/ui/primitives";
import { formatBDT, formatDate } from "@/lib/format";
import { getCourse, getUser, progressOf } from "@/lib/selectors";
import type { Enrollment } from "@/lib/types";
import { useTeacher } from "@/lib/use-teacher";

export default function TeacherStudentsPage() {
  const { db, courses } = useTeacher();
  const [courseId, setCourseId] = useState("");
  const [query, setQuery] = useState("");

  const myCourseIds = new Set(courses.map((c) => c.id));
  const enrollments = db.enrollments.filter((e) => myCourseIds.has(e.courseId));
  const q = query.trim().toLowerCase();
  const rows = enrollments
    .filter((e) => !courseId || e.courseId === courseId)
    .filter((e) => {
      const s = getUser(db, e.studentId);
      return !q || !!s && (s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    })
    .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));

  const avgProgress = rows.length
    ? Math.round(rows.reduce((s, e) => s + progressOf(getCourse(db, e.courseId)!, e).percent, 0) / rows.length)
    : 0;

  return (
    <div>
      <PageHeader title="Students" description="Everyone who has bought your courses." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Enrollments" value={rows.length} />
        <StatCard label="Unique students" value={new Set(rows.map((e) => e.studentId)).size} />
        <StatCard label="Average progress" value={`${avgProgress}%`} />
      </div>
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search students" className="flex-1" />
        <FilterSelect
          label="Course"
          value={courseId}
          onChange={setCourseId}
          options={[
            { value: "", label: "All courses" },
            ...courses.filter((c) => c.status !== "draft").map((c) => ({ value: c.id, label: c.title })),
          ]}
        />
      </div>
      <DataTable<Enrollment>
        rows={rows}
        rowKey={(e) => e.id}
        emptyTitle="No students yet"
        emptyDescription="Students appear here once they buy one of your courses."
        columns={[
          {
            header: "Student",
            cell: (e) => {
              const s = getUser(db, e.studentId);
              return (
                <div className="flex items-center gap-3 min-w-[180px]">
                  <Avatar name={s?.name ?? "?"} src={s?.avatar} size="w-8 h-8" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s?.email}</p>
                  </div>
                </div>
              );
            },
          },
          { header: "Course", cell: (e) => <span className="line-clamp-1">{getCourse(db, e.courseId)?.title}</span> },
          { header: "Enrolled", cell: (e) => <span className="whitespace-nowrap">{formatDate(e.enrolledAt)}</span> },
          {
            header: "Progress",
            cell: (e) => {
              const p = progressOf(getCourse(db, e.courseId)!, e);
              return (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {p.completed}/{p.total} lessons · <b className="text-foreground">{p.percent}%</b>
                </span>
              );
            },
          },
          {
            header: "Paid",
            cell: (e) => formatBDT(db.purchases.find((p) => p.id === e.purchaseId)?.amountPaid ?? 0),
          },
        ]}
      />
    </div>
  );
}
