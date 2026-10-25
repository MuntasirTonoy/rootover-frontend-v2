"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import LoadingAnimation from "./LoadingAnimation";
import { useApp } from "@/context/AppStore";
import { dashboardPath } from "@/lib/selectors";
import type { Role } from "@/lib/types";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

// Client-side route guard for the demo session (not real security)
export default function AuthGuard({ children, allowedRoles = [] }: AuthGuardProps) {
  const { user, hydrated } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, hydrated, router, pathname]);

  if (!hydrated || !user) {
    return (
      <div className="min-h-[70vh] w-full flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  const banned = user.status === "banned";
  if (banned || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
    return (
      <div className="min-h-[70vh] w-full flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-red-500/10 p-5 rounded-full mb-5">
          <AlertCircle className="text-red-500" size={48} />
        </div>
        <h1 className="text-2xl font-bold mb-2">{banned ? "Account Suspended" : "Access Denied"}</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          {banned
            ? "Your account has been suspended by an administrator."
            : "This area belongs to a different role. Use the dashboard for your account instead."}
        </p>
        <Link
          href={banned ? "/" : dashboardPath(user.role)}
          className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary-hover transition-colors"
        >
          {banned ? "Return to Home" : "Go to my dashboard"}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
