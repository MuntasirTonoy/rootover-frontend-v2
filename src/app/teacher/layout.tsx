"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import DashboardShell from "@/components/DashboardShell";
import LoadingAnimation from "@/components/LoadingAnimation";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { teacherNav } from "@/lib/navigation";
import { useApi } from "@/lib/use-api";
import { TeacherContext, type TeacherMe } from "@/lib/use-teacher";
import { btn } from "@/lib/ui";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <LoadingAnimation />
        </div>
      }
    >
      <AuthGuard>
        <TeacherArea>{children}</TeacherArea>
      </AuthGuard>
    </Suspense>
  );
}

// The application page is open to every signed-in user; the rest needs an approved teacher
function TeacherArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useApp();
  const isTeacher = user!.role === "teacher";
  // Loaded once for every teacher page (useTeacher); 403 without a teacher profile
  const me = useApi<TeacherMe>(isTeacher ? "/teacher/me" : null);

  if (pathname.startsWith("/teacher/apply")) {
    return isTeacher ? (
      <DashboardShell title="Teaching" nav={teacherNav}>
        {children}
      </DashboardShell>
    ) : (
      <div className="container-custom py-8 max-w-4xl">{children}</div>
    );
  }

  if (!isTeacher) {
    return (
      <div className="container-custom py-16">
        <EmptyBlock
          icon={GraduationCap}
          title="Teacher tools are locked"
          description={
            user!.role === "admin"
              ? "Admins manage teachers from the admin dashboard."
              : "Apply to become a teacher. Once your application is approved, these tools unlock."
          }
          action={
            <Link href={user!.role === "admin" ? "/admin/dashboard" : "/teacher/apply"} className={btn.primary}>
              {user!.role === "admin" ? "Go to admin dashboard" : "Apply as a teacher"}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <DashboardShell title="Teaching" nav={teacherNav}>
      {ready(me) ? (
        <TeacherContext.Provider value={{ ...me.data, reload: me.reload }}>{children}</TeacherContext.Provider>
      ) : (
        <ApiStatus state={me} />
      )}
    </DashboardShell>
  );
}
