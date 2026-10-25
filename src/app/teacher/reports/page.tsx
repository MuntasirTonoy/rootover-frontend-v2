"use client";

import VideoReportsBoard from "@/components/dashboard/VideoReportsBoard";
import { useTeacher } from "@/lib/use-teacher";

export default function TeacherReportsPage() {
  const { db, teacher } = useTeacher();
  return <VideoReportsBoard mode="teacher" reports={db.videoReports.filter((r) => r.teacherId === teacher.id)} />;
}
