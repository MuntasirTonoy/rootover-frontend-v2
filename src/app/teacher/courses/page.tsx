"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import DataTable from "@/components/ui/DataTable";
import { courseStatusLabel, FilterSelect, PageHeader, SearchInput, Stars, StatusBadge } from "@/components/ui/primitives";
import { confirmAction } from "@/lib/confirm";
import { formatBDT, formatDate } from "@/lib/format";
import { coursePrice } from "@/lib/pricing";
import { courseRating, courseStudentCount, lessonCount, salesTotals } from "@/lib/selectors";
import type { Course } from "@/lib/types";
import { btn } from "@/lib/ui";
import { useTeacher } from "@/lib/use-teacher";

const statusFilter = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export default function TeacherCoursesPage() {
  const { db, courses, deleteCourse, saveCourse } = useTeacher();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const q = query.trim().toLowerCase();
  const rows = courses
    .filter((c) => (!status || c.status === status) && (!q || c.title.toLowerCase().includes(q)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const remove = async (course: Course) => {
    if (await confirmAction({ title: `Delete "${course.title}"?`, text: "This can't be undone.", danger: true, confirmText: "Delete" })) {
      deleteCourse(course.id);
      toast.success("Course deleted");
    }
  };

  const submit = async (course: Course) => {
    if (await confirmAction({ title: "Resubmit for approval?", confirmText: "Submit" })) {
      saveCourse({ ...course, status: "pending", statusNote: undefined });
      toast.success("Course submitted for approval");
    }
  };

  return (
    <div>
      <PageHeader
        title="My courses"
        description="Create, edit and track the approval status of your courses."
        actions={
          <Link href="/teacher/courses/new" className={btn.primary}>
            <Plus size={16} /> New course
          </Link>
        }
      />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search your courses" className="flex-1" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={statusFilter} />
      </div>
      <DataTable<Course>
        rows={rows}
        rowKey={(c) => c.id}
        emptyTitle={courses.length ? "No courses match" : "No courses yet"}
        emptyDescription={courses.length ? "Try another filter." : "Create your first course to start selling."}
        columns={[
          {
            header: "Course",
            cell: (c) => (
              <div className="flex items-center gap-3 min-w-[240px]">
                <CourseThumb course={c} className="!w-20 rounded shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.level} · {c.chapters.length} chapters · {lessonCount(c)} lessons
                  </p>
                </div>
              </div>
            ),
          },
          {
            header: "Status",
            cell: (c) => (
              <div className="max-w-[200px]">
                <StatusBadge status={c.status} label={courseStatusLabel(c.status)} />
                {c.statusNote && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.statusNote}</p>}
              </div>
            ),
          },
          { header: "Price", cell: (c) => formatBDT(coursePrice(c)) },
          { header: "Students", cell: (c) => courseStudentCount(db, c.id) },
          { header: "Net earned", cell: (c) => formatBDT(salesTotals(db.purchases.filter((p) => p.courseId === c.id)).teacherNet) },
          { header: "Rating", cell: (c) => <Stars rating={courseRating(c).average} count={courseRating(c).count} /> },
          { header: "Updated", cell: (c) => <span className="whitespace-nowrap text-xs">{formatDate(c.updatedAt)}</span> },
          {
            header: "Actions",
            className: "text-right",
            cell: (c) => (
              <div className="flex justify-end gap-1">
                <Link href={`/courses/${c.id}`} className={btn.ghost} aria-label={`View ${c.title}`} title="View">
                  <Eye size={16} />
                </Link>
                <Link href={`/teacher/courses/${c.id}/edit`} className={btn.ghost} aria-label={`Edit ${c.title}`} title="Edit">
                  <Pencil size={16} />
                </Link>
                {c.status === "rejected" && (
                  <button onClick={() => submit(c)} className={btn.small}>
                    Resubmit
                  </button>
                )}
                {(c.status === "draft" || c.status === "rejected") && courseStudentCount(db, c.id) === 0 && (
                  <button onClick={() => remove(c)} className={`${btn.ghost} hover:text-red-600`} aria-label={`Delete ${c.title}`} title="Delete">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
