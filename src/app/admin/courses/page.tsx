"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Ban, CheckCircle2, Eye, RotateCcw, XCircle } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import CurriculumList from "@/components/course/CurriculumList";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import { courseStatusLabel, FilterSelect, PageHeader, SearchInput, StatusBadge } from "@/components/ui/primitives";
import { api, errorMessage, withQuery } from "@/lib/api";
import type { AdminCourseDetail, AdminCourseRow, Paginated } from "@/lib/api-types";
import { confirmAction, promptReason } from "@/lib/confirm";
import { formatBDT, formatDate, formatDuration } from "@/lib/format";
import { LEVELS, type CourseStatus } from "@/lib/types";
import { btn } from "@/lib/ui";
import { useApi, useDebounced } from "@/lib/use-api";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "draft", label: "Draft" },
];

// What the action buttons need from a list row or the full course
type Moderated = { id: string; title: string; status: CourseStatus };

export default function AdminCoursesPage() {
  const [status, setStatus] = useState(useSearchParams().get("status") ?? "");
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounced(query.trim());
  // Pending first, then most recently updated; q matches the title or the teacher's name
  const list = useApi<Paginated<AdminCourseRow>>(withQuery("/admin/courses", { status, level, q, page, limit: 10 }));
  const viewing = useApi<AdminCourseDetail>(viewingId && `/admin/courses/${viewingId}`);
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  const change = async (c: Moderated, next: "approved" | "rejected" | "suspended") => {
    let body: { reason: string } | undefined;
    if (next === "rejected" || next === "suspended") {
      const reason = await promptReason({
        title: next === "rejected" ? `Reject "${c.title}"?` : `Suspend "${c.title}"?`,
        placeholder: "This message is shown to the teacher.",
        confirmText: next === "rejected" ? "Reject" : "Suspend",
      });
      if (!reason) return;
      body = { reason };
    } else {
      const ok = await confirmAction({
        title: c.status === "suspended" ? `Reinstate "${c.title}"?` : `Approve "${c.title}"?`,
        text: "The course will be visible and purchasable in the catalog.",
        confirmText: c.status === "suspended" ? "Reinstate" : "Approve",
      });
      if (!ok) return;
    }
    const action = { approved: "approve", rejected: "reject", suspended: "suspend" }[next];
    setBusy(true);
    try {
      await api(`/admin/courses/${c.id}/${action}`, { method: "POST", body });
      toast.success(`Course ${next}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
    list.reload();
    if (viewingId === c.id) viewing.reload();
  };

  const actions = (c: Moderated) => (
    <div className="flex flex-wrap justify-end gap-1">
      {c.status === "pending" && (
        <>
          <button disabled={busy} onClick={() => change(c, "approved")} className={`${btn.small} text-green-700 dark:text-green-400`}>
            <CheckCircle2 size={14} /> Approve
          </button>
          <button disabled={busy} onClick={() => change(c, "rejected")} className={`${btn.small} text-red-600`}>
            <XCircle size={14} /> Reject
          </button>
        </>
      )}
      {c.status === "approved" && (
        <button disabled={busy} onClick={() => change(c, "suspended")} className={`${btn.small} text-purple-700 dark:text-purple-400`}>
          <Ban size={14} /> Suspend
        </button>
      )}
      {c.status === "suspended" && (
        <button disabled={busy} onClick={() => change(c, "approved")} className={btn.small}>
          <RotateCcw size={14} /> Reinstate
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader title="Courses" description="Approve, reject or suspend courses. Only approved courses appear in the catalog." />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={filter(setQuery)} placeholder="Search courses or teachers" className="flex-1" />
        <FilterSelect label="Status" value={status} onChange={filter(setStatus)} options={statusOptions} />
        <FilterSelect
          label="Level"
          value={level}
          onChange={filter(setLevel)}
          options={[{ value: "", label: "All levels" }, ...LEVELS.map((l) => ({ value: l, label: l }))]}
        />
      </div>
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<AdminCourseRow>
          rows={list.data.data}
          rowKey={(c) => c.id}
          emptyTitle="No courses match"
          serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
          columns={[
            {
              header: "Course",
              cell: (c) => (
                <div className="flex items-center gap-3 min-w-[220px]">
                  <CourseThumb course={c} className="!w-16 rounded shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold line-clamp-1">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.teacher.name}</p>
                  </div>
                </div>
              ),
            },
            { header: "Level", cell: (c) => c.level },
            { header: "Price", cell: (c) => formatBDT(c.effectivePrice) },
            { header: "Students", cell: (c) => c.students },
            { header: "Updated", cell: (c) => <span className="whitespace-nowrap text-xs">{formatDate(c.updatedAt)}</span> },
            { header: "Status", cell: (c) => <StatusBadge status={c.status} label={courseStatusLabel(c.status)} /> },
            {
              header: "Actions",
              className: "text-right",
              cell: (c) => (
                <div className="flex justify-end gap-1">
                  <button onClick={() => setViewingId(c.id)} className={btn.small}>
                    <Eye size={14} /> Review
                  </button>
                  {actions(c)}
                </div>
              ),
            },
          ]}
        />
      )}

      {viewingId && (
        <Modal
          open
          onClose={() => setViewingId(null)}
          title={viewing.data?.title ?? "Course"}
          size="xl"
          footer={viewing.data && actions(viewing.data)}
        >
          {!ready(viewing) ? <ApiStatus state={viewing} className="min-h-[30vh]" /> : <CourseReview course={viewing.data} />}
        </Modal>
      )}
    </div>
  );
}

function CourseReview({ course }: { course: AdminCourseDetail }) {
  const lessons = course.chapters.flatMap((ch) => ch.lessons);
  const price = course.effectivePrice;
  return (
    <>
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        <CourseThumb course={course} className="rounded-md" />
        <div className="md:col-span-2 text-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <StatusBadge status={course.status} label={courseStatusLabel(course.status)} />
            <span className="text-muted-foreground">
              {course.level} · {course.subject}
            </span>
          </div>
          <p className="text-muted-foreground">{course.description}</p>
          <p>
            Teacher: <b>{course.teacher.name}</b> ({course.teacher.teacherCode})
            {course.teacher.status === "banned" && <span className="text-red-600"> · banned</span>}
          </p>
          <p>
            Price: <b>{formatBDT(price)}</b>
            {price < course.price && <span className="text-muted-foreground"> (list {formatBDT(course.price)})</span>}
          </p>
          <p>
            {course.chapters.length} chapters · {lessons.length} lessons ·{" "}
            {formatDuration(lessons.reduce((s, l) => s + l.durationMin, 0))}
          </p>
          <p>
            Sales: {course.sales} · gross {formatBDT(course.gross)}
          </p>
          {course.statusNote && (
            <p className="rounded-md bg-surface px-3 py-2">
              <b>Note to teacher:</b> {course.statusNote}
            </p>
          )}
          <Link href={`/courses/${course.id}`} className="inline-block font-semibold text-primary hover:underline">
            Open course page (preview)
          </Link>
        </div>
      </div>
      <h3 className="mb-2 text-sm font-bold">Curriculum (click lessons to watch)</h3>
      <CurriculumList chapters={course.chapters} courseId={course.id} canWatch={() => true} />
    </>
  );
}
