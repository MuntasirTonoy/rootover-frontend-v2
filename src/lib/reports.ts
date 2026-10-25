// Labels and helpers for the video report system
import { findLesson, getCourse, getUser, teacherInfo } from "./selectors";
import type { DemoDB, ReportReason, ReportStatus, VideoReport } from "./types";

export const reasonLabels: Record<ReportReason, { label: string; hint: string }> = {
  VIDEO_ISSUE: { label: "Video issue", hint: "Not playing, frozen or poor quality" },
  AUDIO_ISSUE: { label: "Audio issue", hint: "No sound, noise or out of sync" },
  WRONG_CONTENT: { label: "Wrong content", hint: "Doesn't match the lesson title or chapter" },
  INAPPROPRIATE_CONTENT: { label: "Inappropriate content", hint: "Offensive or unsuitable material" },
  BROKEN_LINK: { label: "Broken link", hint: "Video is private, removed or unavailable" },
  OTHER: { label: "Other", hint: "Something else, please describe it" },
};

export const reportStatusLabels: Record<ReportStatus, string> = {
  open: "Open",
  fix_submitted: "Fix Submitted",
  fix_rejected: "Fix Rejected",
  resolved: "Resolved",
};

export const eventLabels: Record<VideoReport["events"][number]["type"], string> = {
  reported: "Reported",
  fix_submitted: "Fix submitted",
  fix_approved: "Fix approved",
  fix_rejected: "Fix rejected",
};

// A report still needs work until an admin approves the fix
export const isActiveReport = (r: VideoReport) => r.status !== "resolved";

export function reportContext(db: DemoDB, report: VideoReport) {
  const course = getCourse(db, report.courseId);
  const found = course ? findLesson(course, report.lessonId) : undefined;
  return {
    course,
    lesson: found?.lesson,
    chapterTitle: found?.chapterTitle,
    teacher: teacherInfo(db, report.teacherId),
    reporter: getUser(db, report.reporterId),
  };
}

export function reportCounts(reports: VideoReport[]) {
  return {
    needsFix: reports.filter((r) => r.status === "open" || r.status === "fix_rejected").length,
    awaitingApproval: reports.filter((r) => r.status === "fix_submitted").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };
}
