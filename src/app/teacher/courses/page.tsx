"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { courseStatusLabel, FilterSelect, PageHeader, SearchInput, Stars, StatusBadge } from "@/components/ui/primitives";
import { api, ApiError, errorMessage, withQuery } from "@/lib/api";
import type { TeacherCourseRow } from "@/lib/api-types";
import { confirmAction } from "@/lib/confirm";
import { formatBDT, formatDate } from "@/lib/format";
import { btn } from "@/lib/ui";
import { useApi, useDebounced } from "@/lib/use-api";
import { submitCourse } from "@/lib/use-teacher";

const statusFilter = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export default function TeacherCoursesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const q = useDebounced(query.trim());
  // Most recently updated first; q matches the title
  const list = useApi<TeacherCourseRow[]>(withQuery("/teacher/courses", { q, status }));
  const filtered = !!(q || status);

  const remove = async (course: TeacherCourseRow) => {
    if (!(await confirmAction({ title: `Delete "${course.title}"?`, text: "This can't be undone.", danger: true, confirmText: "Delete" })))
      return;
    try {
      await api(`/teacher/courses/${course.id}`, { method: "DELETE" });
      list.setData((rows) => (rows ?? []).filter((c) => c.id !== course.id));
      toast.success("Course deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // The API runs the full check on the saved course; missing fields are fixed in the editor
  const submit = async (course: TeacherCourseRow) => {
    if (!(await confirmAction({ title: "Resubmit for approval?", confirmText: "Submit" }))) return;
    try {
      await submitCourse(course.id);
      list.reload();
      toast.success("Course submitted for approval");
    } catch (err) {
      toast.error(errorMessage(err));
      if (err instanceof ApiError && err.fields) router.push(`/teacher/courses/${course.id}/edit`);
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
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<TeacherCourseRow>
          rows={list.data}
          rowKey={(c) => c.id}
          emptyTitle={filtered ? "No courses match" : "No courses yet"}
          emptyDescription={filtered ? "Try another filter." : "Create your first course to start selling."}
          columns={[
            {
              header: "Course",
              cell: (c) => (
                <div className="flex items-center gap-3 min-w-[240px]">
                  <CourseThumb course={c} className="!w-20 rounded shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.level} · {c.chapters} chapters · {c.lessons} lessons
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
            { header: "Price", cell: (c) => formatBDT(c.effectivePrice) },
            { header: "Students", cell: (c) => c.students },
            { header: "Net earned", cell: (c) => formatBDT(c.net) },
            { header: "Rating", cell: (c) => <Stars rating={c.rating.average} count={c.rating.count} /> },
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
                  {/* Only drafts and rejected courses nobody has bought can be deleted */}
                  {(c.status === "draft" || c.status === "rejected") && c.students === 0 && (
                    <button onClick={() => remove(c)} className={`${btn.ghost} hover:text-red-600`} aria-label={`Delete ${c.title}`} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
