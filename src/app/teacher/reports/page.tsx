"use client";

import VideoReportsBoard from "@/components/dashboard/VideoReportsBoard";
import { useApp } from "@/context/AppStore";
import { useTeacher } from "@/lib/use-teacher";

// Still on the demo data until the video report API exists; the mock seed
// shares teacher ids with the backend, so seeded teachers see their reports
export default function TeacherReportsPage() {
  const { db } = useApp();
  const { teacher } = useTeacher();
  return <VideoReportsBoard mode="teacher" reports={db.videoReports.filter((r) => r.teacherId === teacher.id)} />;
}
