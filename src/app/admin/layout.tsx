"use client";

import { Suspense } from "react";
import AuthGuard from "@/components/AuthGuard";
import DashboardShell from "@/components/DashboardShell";
import LoadingAnimation from "@/components/LoadingAnimation";
import { adminNav } from "@/lib/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <LoadingAnimation />
        </div>
      }
    >
      <AuthGuard allowedRoles={["admin"]}>
        <DashboardShell title="Admin" nav={adminNav}>
          {children}
        </DashboardShell>
      </AuthGuard>
    </Suspense>
  );
}
