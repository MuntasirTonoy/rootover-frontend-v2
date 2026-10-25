"use client";

import VideoReportsBoard from "@/components/dashboard/VideoReportsBoard";
import { useApp } from "@/context/AppStore";

export default function AdminVideoReportsPage() {
  const { db } = useApp();
  return <VideoReportsBoard mode="admin" reports={db.videoReports} />;
}
