"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Ban, CheckCircle2, Eye, RotateCcw, XCircle } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import CurriculumList from "@/components/course/CurriculumList";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import { courseStatusLabel, FilterSelect, PageHeader, SearchInput, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { confirmAction, promptReason } from "@/lib/confirm";
import { formatBDT, formatDate, formatDuration } from "@/lib/format";
import { coursePrice } from "@/lib/pricing";
import { courseDuration, courseStudentCount, lessonCount, salesTotals, teacherInfo } from "@/lib/selectors";
import { LEVELS, type Course, type CourseStatus } from "@/lib/types";
import { btn } from "@/lib/ui";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "draft", label: "Draft" },
];

export default function AdminCoursesPage() {
  const { db, setCourseStatus } = useApp();
  const [status, setStatus] = useState(useSearchParams().get("status") ?? "");
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const rows = db.courses
    .filter(
      (c) =>
        (!status || c.status === status) &&
        (!level || c.level === level) &&
        (!q || c.title.toLowerCase().includes(q) || (teacherInfo(db, c.teacherId)?.name ?? "").toLowerCase().includes(q)),
    )
    .sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending") || b.updatedAt.localeCompare(a.updatedAt));
  const viewing = db.courses.find((c) => c.id === viewingId);

  const change = async (c: Course, next: CourseStatus) => {
    if (next === "rejected" || next === "suspended") {
      const reason = await promptReason({
        title: next === "rejected" ? `Reject "${c.title}"?` : `Suspend "${c.title}"?`,
        placeholder: "This message is shown to the teacher.",
        confirmText: next === "rejected" ? "Reject" : "Suspend",
      });
      if (!reason) return;
      setCourseStatus(c.id, next, reason);
    } else {
      const ok = await confirmAction({
        title: c.status === "suspended" ? `Reinstate "${c.title}"?` : `Approve "${c.title}"?`,
        text: "The course will be visible and purchasable in the catalog.",
        confirmText: c.status === "suspended" ? "Reinstate" : "Approve",
      });
      if (!ok) return;
      setCourseStatus(c.id, "approved");
    }
    toast.success(`Course ${next === "approved" ? "approved" : next}`);
  };

  const actions = (c: Course) => (
    <div className="flex flex-wrap justify-end gap-1">
      {c.status === "pending" && (
        <>
          <button onClick={() => change(c, "approved")} className={`${btn.small} text-green-700 dark:text-green-400`}>
            <CheckCircle2 size={14} /> Approve
          </button>
          <button onClick={() => change(c, "rejected")} className={`${btn.small} text-red-600`}>
            <XCircle size={14} /> Reject
          </button>
        </>
      )}
      {c.status === "approved" && (
        <button onClick={() => change(c, "suspended")} className={`${btn.small} text-purple-700 dark:text-purple-400`}>
          <Ban size={14} /> Suspend
        </button>
      )}
      {c.status === "suspended" && (
        <button onClick={() => change(c, "approved")} className={btn.small}>
          <RotateCcw size={14} /> Reinstate
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader title="Courses" description="Approve, reject or suspend courses. Only approved courses appear in the catalog." />
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search courses or teachers" className="flex-1" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
        <FilterSelect
          label="Level"
          value={level}
          onChange={setLevel}
          options={[{ value: "", label: "All levels" }, ...LEVELS.map((l) => ({ value: l, label: l }))]}
        />
      </div>
      <DataTable<Course>
        rows={rows}
        rowKey={(c) => c.id}
        emptyTitle="No courses match"
        columns={[
          {
            header: "Course",
            cell: (c) => (
              <div className="flex items-center gap-3 min-w-[220px]">
                <CourseThumb course={c} className="!w-16 rounded shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold line-clamp-1">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{teacherInfo(db, c.teacherId)?.name}</p>
                </div>
              </div>
            ),
          },
          { header: "Level", cell: (c) => c.level },
          { header: "Price", cell: (c) => formatBDT(coursePrice(c)) },
          { header: "Students", cell: (c) => courseStudentCount(db, c.id) },
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

      {viewing && (
        <Modal open onClose={() => setViewingId(null)} title={viewing.title} size="xl" footer={actions(viewing)}>
          <div className="grid md:grid-cols-3 gap-5 mb-5">
            <CourseThumb course={viewing} className="rounded-md" />
            <div className="md:col-span-2 text-sm space-y-1.5">
              <div className="flex items-center gap-2">
                <StatusBadge status={viewing.status} label={courseStatusLabel(viewing.status)} />
                <span className="text-muted-foreground">
                  {viewing.level} · {viewing.subject}
                </span>
              </div>
              <p className="text-muted-foreground">{viewing.description}</p>
              <p>
                Teacher: <b>{teacherInfo(db, viewing.teacherId)?.name}</b> ({teacherInfo(db, viewing.teacherId)?.teacherCode})
              </p>
              <p>
                Price: <b>{formatBDT(coursePrice(viewing))}</b>
                {coursePrice(viewing) < viewing.price && <span className="text-muted-foreground"> (list {formatBDT(viewing.price)})</span>}
              </p>
              <p>
                {viewing.chapters.length} chapters · {lessonCount(viewing)} lessons · {formatDuration(courseDuration(viewing))}
              </p>
              <p>
                Sales: {salesTotals(db.purchases.filter((p) => p.courseId === viewing.id)).sales} · gross{" "}
                {formatBDT(salesTotals(db.purchases.filter((p) => p.courseId === viewing.id)).gross)}
              </p>
              {viewing.statusNote && (
                <p className="rounded-md bg-surface px-3 py-2">
                  <b>Note to teacher:</b> {viewing.statusNote}
                </p>
              )}
              <Link href={`/courses/${viewing.id}`} className="inline-block font-semibold text-primary hover:underline">
                Open course page (preview)
              </Link>
            </div>
          </div>
          <h3 className="mb-2 text-sm font-bold">Curriculum (click lessons to watch)</h3>
          <CurriculumList chapters={viewing.chapters} courseId={viewing.id} canWatch={() => true} />
        </Modal>
      )}
    </div>
  );
}
