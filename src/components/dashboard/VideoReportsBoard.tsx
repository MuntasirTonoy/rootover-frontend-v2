"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Eye, Flag, Pencil, PlayCircle, Send, XCircle } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import { FilterSelect, PageHeader, SearchInput, StatCard, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatDateTime } from "@/lib/format";
import { eventLabels, reasonLabels, reportContext, reportCounts, reportStatusLabels } from "@/lib/reports";
import { getEmbedUrl } from "@/lib/youtube";
import type { VideoReport } from "@/lib/types";
import { btn, field } from "@/lib/ui";

type Mode = "teacher" | "admin";

// What each side has to act on: teachers fix, admins review fixes
const needsAction: Record<Mode, VideoReport["status"][]> = {
  teacher: ["fix_rejected", "open"],
  admin: ["fix_submitted"],
};

const statusOptions = [
  { value: "action", label: "Needs my action" },
  { value: "", label: "All statuses" },
  ...Object.entries(reportStatusLabels).map(([value, label]) => ({ value, label })),
];

export default function VideoReportsBoard({ mode, reports }: { mode: Mode; reports: VideoReport[] }) {
  const { db } = useApp();
  const [status, setStatus] = useState("action");
  const [query, setQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const priority = needsAction[mode];
  const q = query.trim().toLowerCase();
  const rows = reports
    .filter((r) => (status === "action" ? priority.includes(r.status) : !status || r.status === status))
    .filter((r) => {
      if (!q) return true;
      const { course, lesson, reporter } = reportContext(db, r);
      return [course?.title, lesson?.title, reporter?.name, reasonLabels[r.reason].label].some((s) =>
        s?.toLowerCase().includes(q),
      );
    })
    .sort((a, b) => {
      const pa = priority.indexOf(a.status);
      const pb = priority.indexOf(b.status);
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb) || b.updatedAt.localeCompare(a.updatedAt);
    });
  const counts = reportCounts(reports);
  const viewing = reports.find((r) => r.id === viewingId);

  return (
    <div>
      <PageHeader
        title="Video reports"
        description={
          mode === "teacher"
            ? "Problems students reported on your lessons. Fix the lesson, then submit the fix for admin approval."
            : "Teachers submit fixes for reported videos. Approve the fix to close the report, or reject it to send it back."
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Needs teacher fix" value={counts.needsFix} icon={Flag} hint="Open or fix rejected" />
        <StatCard label="Awaiting admin approval" value={counts.awaitingApproval} hint="Fix submitted" />
        <StatCard label="Resolved" value={counts.resolved} />
      </div>
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by course, lesson, student or reason" className="flex-1" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
      </div>

      <DataTable<VideoReport>
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setViewingId(r.id)}
        emptyTitle={status === "action" ? "Nothing needs your action" : "No reports match"}
        emptyDescription={status === "action" ? "Switch the filter to see every report." : undefined}
        columns={[
          {
            header: "Lesson",
            cell: (r) => {
              const { course, lesson, chapterTitle } = reportContext(db, r);
              return (
                <div className="min-w-[200px]">
                  <p className="font-semibold line-clamp-1">{lesson?.title ?? "Deleted lesson"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {course?.title} · {chapterTitle}
                  </p>
                </div>
              );
            },
          },
          { header: "Reason", cell: (r) => <span className="whitespace-nowrap">{reasonLabels[r.reason].label}</span> },
          ...(mode === "admin"
            ? [{ header: "Teacher", cell: (r: VideoReport) => reportContext(db, r).teacher?.name ?? "—" }]
            : []),
          { header: "Reported by", cell: (r) => reportContext(db, r).reporter?.name ?? "—" },
          {
            header: "Status",
            cell: (r) => <StatusBadge status={r.status} label={reportStatusLabels[r.status]} />,
          },
          { header: "Updated", cell: (r) => <span className="whitespace-nowrap text-xs">{formatDateTime(r.updatedAt)}</span> },
          {
            header: "",
            className: "text-right",
            cell: (r) => (
              <button className={btn.small} onClick={() => setViewingId(r.id)}>
                <Eye size={14} /> {priority.includes(r.status) ? (mode === "teacher" ? "Fix" : "Review") : "View"}
              </button>
            ),
          },
        ]}
      />

      {viewing && (
        <ReportDetail key={viewing.id} report={viewing} mode={mode} onClose={() => setViewingId(null)} />
      )}
    </div>
  );
}

function ReportDetail({ report, mode, onClose }: { report: VideoReport; mode: Mode; onClose: () => void }) {
  const { db, submitReportFix, reviewReportFix } = useApp();
  const { course, lesson, chapterTitle, teacher, reporter } = reportContext(db, report);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const canFix = mode === "teacher" && (report.status === "open" || report.status === "fix_rejected");
  const canReview = mode === "admin" && report.status === "fix_submitted";

  const run = (fn: () => void, success: string) => {
    try {
      fn();
      toast.success(success);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const footer = canFix ? (
    <button
      onClick={() => run(() => submitReportFix(report.id, note), "Fix submitted for admin approval")}
      className={btn.primary}
    >
      <Send size={16} /> Submit fix for approval
    </button>
  ) : canReview ? (
    <>
      <button
        onClick={() => run(() => reviewReportFix(report.id, "reject", note), "Fix rejected and sent back to the teacher")}
        className={`${btn.secondary} text-red-600`}
      >
        <XCircle size={16} /> Reject fix
      </button>
      <button
        onClick={() => run(() => reviewReportFix(report.id, "approve", note), "Fix approved. Report resolved.")}
        className={btn.primary}
      >
        <CheckCircle2 size={16} /> Approve fix
      </button>
    </>
  ) : undefined;

  return (
    <Modal open onClose={onClose} title={`Report: ${lesson?.title ?? "Deleted lesson"}`} size="xl" footer={footer}>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {lesson && (
            <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
              <iframe src={getEmbedUrl(lesson.videoUrl)} title={lesson.title} className="h-full w-full" allowFullScreen />
            </div>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Course</dt>
            <dd className="font-medium">{course?.title}</dd>
            <dt className="text-muted-foreground">Chapter</dt>
            <dd className="font-medium">{chapterTitle}</dd>
            <dt className="text-muted-foreground">Reason</dt>
            <dd className="font-medium">{reasonLabels[report.reason].label}</dd>
            <dt className="text-muted-foreground">Reported by</dt>
            <dd className="font-medium">{reporter?.name}</dd>
            {mode === "admin" && (
              <>
                <dt className="text-muted-foreground">Teacher</dt>
                <dd className="font-medium">{teacher?.name}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={report.status} label={reportStatusLabels[report.status]} />
            </dd>
          </dl>
          {report.description && (
            <p className="rounded-md bg-surface px-3 py-2 text-sm">
              <b>Student says:</b> {report.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {lesson && (
              <Link href={`/learn/${report.courseId}?lesson=${report.lessonId}`} target="_blank" className={btn.small}>
                <PlayCircle size={14} /> Open in player
              </Link>
            )}
            {mode === "teacher" && (
              <Link href={`/teacher/courses/${report.courseId}/edit`} className={btn.small}>
                <Pencil size={14} /> Edit lesson in course editor
              </Link>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold">History</h3>
          <ol className="relative space-y-4 border-l border-border pl-4">
            {report.events.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                    e.type === "fix_rejected" ? "bg-red-500" : e.type === "fix_approved" ? "bg-green-500" : "bg-primary"
                  }`}
                />
                <p className="text-sm font-semibold">{eventLabels[e.type]}</p>
                <p className="text-xs text-muted-foreground">
                  {e.actorName} · {formatDateTime(e.at)}
                </p>
                {e.note && <p className="mt-1 rounded-md bg-surface px-2.5 py-1.5 text-sm">{e.note}</p>}
              </li>
            ))}
          </ol>

          {(canFix || canReview) && (
            <div className="mt-6 space-y-2">
              {canFix && report.status === "fix_rejected" && report.adminNote && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                  <b>Admin rejected your last fix:</b> {report.adminNote}
                </p>
              )}
              <label htmlFor="report-note" className="block text-sm font-semibold">
                {canFix ? "What did you fix?" : "Note to the teacher (required to reject)"}
              </label>
              <textarea
                id="report-note"
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setError("");
                }}
                placeholder={
                  canFix ? "e.g. Re-uploaded the video and updated the lesson link." : "e.g. The audio is still missing after 05:00."
                }
                className={field}
              />
              {error && (
                <p className="text-sm font-medium text-red-600" role="alert">
                  {error}
                </p>
              )}
              {canFix && (
                <p className="text-xs text-muted-foreground">
                  Update the lesson in the course editor first, then submit the fix here for admin approval.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
