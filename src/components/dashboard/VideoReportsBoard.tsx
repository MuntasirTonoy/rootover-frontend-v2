"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Eye, Flag, Loader2, Pencil, PlayCircle, Send, XCircle } from "lucide-react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import { FilterSelect, PageHeader, SearchInput, StatCard, StatusBadge } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { VideoReportBoard, VideoReportView } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";
import { eventLabels, reasonLabels, reportStatusLabels } from "@/lib/reports";
import type { ReportStatus } from "@/lib/types";
import { btn, field } from "@/lib/ui";
import { useApi, useDebounced } from "@/lib/use-api";

type Mode = "teacher" | "admin";

// What each side has to act on: teachers fix, admins review fixes
const needsAction: Record<Mode, ReportStatus[]> = {
  teacher: ["fix_rejected", "open"],
  admin: ["fix_submitted"],
};

const listPath: Record<Mode, string> = { teacher: "/teacher/reports", admin: "/admin/video-reports" };

const statusOptions = [
  { value: "action", label: "Needs my action" },
  { value: "", label: "All statuses" },
  ...Object.entries(reportStatusLabels).map(([value, label]) => ({ value, label })),
];

// Admins oversee every report (open ones are still with the teacher), so they
// start on all statuses; teachers start on their to-do list. The API sorts by
// what this role has to act on, then newest update, under any filter; q matches
// the course, the lesson or the student. Counts cover every report the role sees.
const defaultStatus: Record<Mode, string> = { teacher: "action", admin: "" };

export default function VideoReportsBoard({ mode }: { mode: Mode }) {
  const [status, setStatus] = useState(defaultStatus[mode]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const q = useDebounced(query.trim());
  // status is always sent: "" means every status, "action" the role's to-do list
  const list = useApi<VideoReportBoard>(
    `${listPath[mode]}?${new URLSearchParams({ status, page: String(page), limit: "10", ...(q ? { q } : {}) })}`,
  );
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };
  const priority = needsAction[mode];
  const counts = list.data?.counts;
  const viewing = list.data?.data.find((r) => r.id === viewingId);

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
      {counts && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Needs teacher fix" value={counts.needsFix} icon={Flag} hint="Open or fix rejected" />
          <StatCard label="Awaiting admin approval" value={counts.awaitingApproval} hint="Fix submitted" />
          <StatCard label="Resolved" value={counts.resolved} />
        </div>
      )}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={filter(setQuery)} placeholder="Search by course, lesson or student" className="flex-1" />
        <FilterSelect label="Status" value={status} onChange={filter(setStatus)} options={statusOptions} />
      </div>

      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<VideoReportView>
          rows={list.data.data}
          rowKey={(r) => r.id}
          onRowClick={(r) => setViewingId(r.id)}
          emptyTitle={status === "action" ? "Nothing needs your action" : "No reports match"}
          emptyDescription={status === "action" ? "Switch the filter to see every report." : undefined}
          serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
          columns={[
            {
              header: "Lesson",
              cell: (r) => (
                <div className="min-w-[200px]">
                  <p className="font-semibold line-clamp-1">{r.lesson.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {r.course.title} · {r.chapter.title}
                  </p>
                </div>
              ),
            },
            { header: "Reason", cell: (r) => <span className="whitespace-nowrap">{reasonLabels[r.reason].label}</span> },
            ...(mode === "admin" ? [{ header: "Teacher", cell: (r: VideoReportView) => r.teacher.name }] : []),
            { header: "Reported by", cell: (r) => r.reporter.name },
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
      )}

      {viewing && (
        <ReportDetail
          key={viewing.id}
          report={viewing}
          mode={mode}
          onClose={() => setViewingId(null)}
          onChanged={() => {
            setViewingId(null);
            list.reload();
          }}
        />
      )}
    </div>
  );
}

function ReportDetail({
  report,
  mode,
  onClose,
  onChanged,
}: {
  report: VideoReportView;
  mode: Mode;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canFix = mode === "teacher" && (report.status === "open" || report.status === "fix_rejected");
  const canReview = mode === "admin" && report.status === "fix_submitted";

  const run = async (path: string, body: Record<string, string | undefined>, success: string) => {
    setBusy(true);
    try {
      await api(path, { method: "POST", body });
      toast.success(success);
      onChanged();
    } catch (err) {
      // Validation errors arrive per field (note / reason)
      setError(err instanceof ApiError ? (Object.values(err.fields ?? {})[0] ?? err.message) : errorMessage(err));
      setBusy(false);
    }
  };

  const text = note.trim();
  const footer = canFix ? (
    <button
      disabled={busy}
      onClick={() => run(`/teacher/reports/${report.id}/submit-fix`, { note: text }, "Fix submitted for admin approval")}
      className={btn.primary}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit fix for approval
    </button>
  ) : canReview ? (
    <>
      <button
        disabled={busy}
        onClick={() =>
          run(`/admin/video-reports/${report.id}/reject-fix`, { reason: text }, "Fix rejected and sent back to the teacher")
        }
        className={`${btn.secondary} text-red-600`}
      >
        <XCircle size={16} /> Reject fix
      </button>
      <button
        disabled={busy}
        onClick={() =>
          run(`/admin/video-reports/${report.id}/approve-fix`, { note: text || undefined }, "Fix approved. Report resolved.")
        }
        className={btn.primary}
      >
        <CheckCircle2 size={16} /> Approve fix
      </button>
    </>
  ) : undefined;

  return (
    <Modal open onClose={onClose} title={`Report: ${report.lesson.title}`} size="xl" footer={footer}>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
            <iframe src={report.lesson.videoUrl} title={report.lesson.title} className="h-full w-full" allowFullScreen />
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Course</dt>
            <dd className="font-medium">{report.course.title}</dd>
            <dt className="text-muted-foreground">Chapter</dt>
            <dd className="font-medium">{report.chapter.title}</dd>
            <dt className="text-muted-foreground">Reason</dt>
            <dd className="font-medium">{reasonLabels[report.reason].label}</dd>
            <dt className="text-muted-foreground">Reported by</dt>
            <dd className="font-medium">{report.reporter.name}</dd>
            {mode === "admin" && (
              <>
                <dt className="text-muted-foreground">Teacher</dt>
                <dd className="font-medium">{report.teacher.name}</dd>
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
            <Link href={`/learn/${report.course.id}?lesson=${report.lesson.id}`} target="_blank" className={btn.small}>
              <PlayCircle size={14} /> Open in player
            </Link>
            {mode === "teacher" && (
              <Link href={`/teacher/courses/${report.course.id}/edit`} className={btn.small}>
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
