// Labels and helpers for the video report system
import type { VideoReportView } from "./api-types";
import type { ReportReason, ReportStatus } from "./types";

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
  resolved: "Approved",
};

export const eventLabels: Record<VideoReportView["events"][number]["type"], string> = {
  reported: "Reported",
  fix_submitted: "Fix submitted",
  fix_approved: "Fix approved",
  fix_rejected: "Fix rejected",
};
