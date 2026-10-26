"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { api, ApiError, errorMessage } from "@/lib/api";
import { reasonLabels } from "@/lib/reports";
import { REPORT_REASONS, type ReportReason } from "@/lib/types";
import { btn, field, fieldError } from "@/lib/ui";

// "Report" action in the course player; only rendered for students who can watch the lesson.
// `reported` comes from the player's myOpenReportLessonIds.
export default function ReportVideoButton({
  courseId,
  lessonId,
  lessonTitle,
  reported,
  onReported,
  className = "",
}: {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  reported: boolean;
  onReported: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setOpen(false);
    setReason("");
    setDescription("");
    setError("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return setError("Choose what's wrong with this video.");
    if (reason === "OTHER" && !description.trim()) return setError("Please describe the problem.");
    setSubmitting(true);
    try {
      await api(`/learn/${courseId}/lessons/${lessonId}/reports`, {
        method: "POST",
        body: { reason, description: description.trim() || undefined },
      });
      toast.success("Thanks! The teacher has been notified and will fix it.");
      close();
      onReported();
    } catch (err) {
      // Already reported (e.g. from another tab): show it as reported
      if (err instanceof ApiError && err.status === 409) {
        toast.info(err.message);
        close();
        onReported();
        return;
      }
      setError(err instanceof ApiError ? (Object.values(err.fields ?? {})[0] ?? err.message) : errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (reported) {
    return (
      <button
        disabled
        className={`${btn.secondary} ${className}`}
        title="You've already reported this video. We'll update you when it's fixed."
      >
        <Flag size={16} className="text-amber-500" /> Reported
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={`${btn.secondary} ${className}`}>
        <Flag size={16} /> Report
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Report a problem with this video"
        size="md"
        footer={
          <>
            <button onClick={close} className={btn.secondary}>
              Cancel
            </button>
            <button type="submit" form="report-video-form" disabled={submitting} className={btn.danger}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Submit report
            </button>
          </>
        }
      >
        <form id="report-video-form" onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-sm text-muted-foreground">
            Lesson: <b className="text-foreground">{lessonTitle}</b>
          </p>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">What&apos;s wrong?</legend>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                    reason === r ? "border-primary bg-primary/5" : "border-border hover:bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      setError("");
                    }}
                    className="mt-0.5 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{reasonLabels[r].label}</span>
                    <span className="block text-xs text-muted-foreground">{reasonLabels[r].hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="report-description" className="block text-sm font-semibold mb-1.5">
              Details {reason === "OTHER" ? "(required)" : "(optional)"}
            </label>
            <textarea
              id="report-description"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. The audio cuts out at 05:30"
              className={`${field} ${error && reason === "OTHER" && !description.trim() ? fieldError : ""}`}
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
