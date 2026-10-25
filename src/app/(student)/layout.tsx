"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import DashboardShell from "@/components/DashboardShell";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useApp } from "@/context/AppStore";
import { adminNav, studentNav, teacherNav } from "@/lib/navigation";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <LoadingAnimation />
        </div>
      }
    >
      <LearningArea>{children}</LearningArea>
    </Suspense>
  );
}

// Learning pages are student-only. /profile is shared by every role, shown
// inside that role's own sidebar.
function LearningArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useApp();
  const isProfile = pathname === "/profile";
  const shell =
    user?.role === "admin"
      ? { title: "Admin", nav: adminNav }
      : user?.role === "teacher"
        ? { title: "Teaching", nav: teacherNav }
        : { title: "Learning", nav: studentNav };

  return (
    <AuthGuard allowedRoles={isProfile ? [] : ["student"]}>
      <DashboardShell title={shell.title} nav={shell.nav}>
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
