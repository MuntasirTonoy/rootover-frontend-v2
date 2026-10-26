"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Flag, PlayCircle } from "lucide-react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock, FilterSelect, PageHeader, StatusBadge } from "@/components/ui/primitives";
import type { VideoReportView } from "@/lib/api-types";
import { formatDate, formatDateTime } from "@/lib/format";
import { eventLabels, reasonLabels, reportStatusLabels } from "@/lib/reports";
import type { ReportStatus } from "@/lib/types";
import { btn, card } from "@/lib/ui";
import { useApi } from "@/lib/use-api";

// What each status means from the student's side
const statusHints: Record<ReportStatus, string> = {
  open: "Waiting for the teacher to fix this video.",
  fix_submitted: "The teacher submitted a fix. An admin is checking it.",
  fix_rejected: "An admin sent the fix back to the teacher. It's being worked on again.",
  resolved: "Fixed and approved. Thanks for reporting it! If you notice a new problem with this video, you can report it again from the lesson.",
};

const statusOptions = [
  { value: "", label: "All statuses" },
  ...Object.entries(reportStatusLabels).map(([value, label]) => ({ value, label })),
];

export default function MyVideoReportsPage() {
  // Newest first, from the API
  const list = useApi<VideoReportView[]>("/me/video-reports");
  const [status, setStatus] = useState("");

  if (!ready(list)) return <ApiStatus state={list} />;
  const reports = list.data;
  const visible = status ? reports.filter((r) => r.status === status) : reports;

  return (
    <div>
      <PageHeader
        title="Video Reports"
        description="Problems you reported with lesson videos, and what happened to them."
      />

      {reports.length === 0 ? (
        <EmptyBlock
          icon={Flag}
          title="No reports yet"
          description="If a lesson video doesn't play or has a problem, use the Report button in the course player."
          action={
            <Link href="/my-classes" className={btn.primary}>
              Go to My Classes
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex justify-end">
            <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
          </div>
          {visible.length === 0 ? (
            <EmptyBlock title="No reports with this status" description="Try a different status." />
          ) : (
            <div className="space-y-4">
              {visible.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: VideoReportView }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={`${card} p-4`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary truncate">{report.course.title}</p>
          <h3 className="font-bold text-foreground">{report.lesson.title}</h3>
          <p className="text-xs text-muted-foreground">
            {report.chapter.title} · {report.teacher.name}
          </p>
        </div>
        <StatusBadge status={report.status} label={reportStatusLabels[report.status]} />
      </div>

      <p className="mt-3 text-sm text-foreground">{statusHints[report.status]}</p>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Reason</dt>
        <dd className="font-medium">{reasonLabels[report.reason].label}</dd>
        <dt className="text-muted-foreground">Reported</dt>
        <dd className="font-medium">{formatDate(report.createdAt)}</dd>
        {report.resolvedAt && (
          <>
            <dt className="text-muted-foreground">Approved</dt>
            <dd className="font-medium">{formatDate(report.resolvedAt)}</dd>
          </>
        )}
      </dl>
      {report.description && (
        <p className="mt-3 rounded-md bg-surface px-3 py-2 text-sm">
          <b>You said:</b> {report.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/learn/${report.course.id}?lesson=${report.lesson.id}`} className={btn.small}>
          <PlayCircle size={14} /> {report.status === "resolved" ? "Open lesson (report again)" : "Open lesson"}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={btn.ghost}
        >
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          {open ? "Hide history" : "Show history"}
        </button>
      </div>

      {open && (
        <ol className="relative mt-4 space-y-4 border-l border-border pl-4">
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
      )}
    </article>
  );
}
