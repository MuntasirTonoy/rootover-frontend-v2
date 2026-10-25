"use client";

import { useState } from "react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { Avatar, FilterSelect, PageHeader, SearchInput, StatCard } from "@/components/ui/primitives";
import { withQuery } from "@/lib/api";
import type { TeacherCourseRow, TeacherStudentRow, TeacherStudents } from "@/lib/api-types";
import { formatBDT, formatDate } from "@/lib/format";
import { useApi, useDebounced } from "@/lib/use-api";

export default function TeacherStudentsPage() {
  const [courseId, setCourseId] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim());

  const courses = useApi<TeacherCourseRow[]>("/teacher/courses").data ?? [];
  // Newest enrollments first; q matches the student's name or email. Stats cover every filtered row.
  const list = useApi<TeacherStudents>(withQuery("/teacher/students", { courseId, q, page, limit: 10 }));
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Students" description="Everyone who has bought your courses." />
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Enrollments" value={list.data.stats.enrollments} />
            <StatCard label="Unique students" value={list.data.stats.uniqueStudents} />
            <StatCard label="Average progress" value={`${list.data.stats.averageProgress}%`} />
          </div>
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <SearchInput value={query} onChange={filter(setQuery)} placeholder="Search students" className="flex-1" />
            <FilterSelect
              label="Course"
              value={courseId}
              onChange={filter(setCourseId)}
              options={[
                { value: "", label: "All courses" },
                ...courses.filter((c) => c.status !== "draft").map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          </div>
          <DataTable<TeacherStudentRow>
            rows={list.data.data}
            rowKey={(r) => r.enrollment.id}
            emptyTitle="No students yet"
            emptyDescription="Students appear here once they buy one of your courses."
            serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
            columns={[
              {
                header: "Student",
                cell: ({ student }) => (
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <Avatar name={student.name} src={student.avatar} size="w-8 h-8" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                    </div>
                  </div>
                ),
              },
              { header: "Course", cell: (r) => <span className="line-clamp-1">{r.course.title}</span> },
              { header: "Enrolled", cell: (r) => <span className="whitespace-nowrap">{formatDate(r.enrollment.enrolledAt)}</span> },
              {
                header: "Progress",
                cell: ({ progress: p }) => (
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {p.completed}/{p.total} lessons · <b className="text-foreground">{p.percent}%</b>
                  </span>
                ),
              },
              { header: "Paid", cell: (r) => formatBDT(r.amountPaid) },
            ]}
          />
        </>
      )}
    </div>
  );
}
