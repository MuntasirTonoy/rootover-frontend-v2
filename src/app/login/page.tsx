"use client";

import { useState, Suspense, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { useApp } from "@/context/AppStore";
import { ApiError, errorMessage } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { useConfig } from "@/lib/use-config";
import { dashboardPath } from "@/lib/navigation";
import type { Role, User as AppUser } from "@/lib/types";
import { btn, field } from "@/lib/ui";

const roleIcons = { admin: ShieldCheck, teacher: GraduationCap, student: User };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, loginAs } = useApp();
  // One-click demo logins exist only on demo deployments (DEMO_MODE on the API)
  const demo = useConfig()?.demo;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<Role | null>(null);

  // Demo sign-ins always land on the role's dashboard; normal sign-ins honour ?redirect
  const finish = (user: AppUser, useRedirect: boolean) => {
    toast.success(`Welcome back, ${user.name}!`);
    router.push(useRedirect && redirect ? redirect : dashboardPath(user.role));
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      finish(await login(email, password), true);
    } catch (err) {
      // Accounts must confirm their sign-up code first
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        toast.info("Enter the code we emailed you to finish signing up.");
        router.push(`/register?verify=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  const handleDemo = async (role: Role) => {
    setDemoLoading(role);
    try {
      finish(await loginAs(role), false);
    } catch (err) {
      toast.error(errorMessage(err));
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4">
      <div className={`w-full grid gap-6 ${demo ? "max-w-4xl md:grid-cols-2" : "max-w-md"}`}>
        {/* Credentials form */}
        <div className="bg-card border border-border rounded-lg p-6 md:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-1">Welcome back</h1>
          <p className="text-muted-foreground mb-6">Sign in to continue your learning journey.</p>

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${field} pl-10 py-3`}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="password" className="block text-sm font-semibold">
                  Password
                </label>
                <Link
                  href={`/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${field} pl-10 pr-10 py-3`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading || !email || !password} className={`${btn.primary} w-full py-3`}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Demo accounts */}
        {demo && (
        <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-6 md:p-8">
          <h2 className="text-lg font-extrabold text-foreground">Demo login</h2>
          <p className="text-sm text-muted-foreground mb-5">
            One click to explore each role. These fictional accounts come from the demo server&apos;s seed
            data.
          </p>
          <div className="space-y-3">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = roleIcons[account.role];
              return (
                <div key={account.role} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 text-xs">
                        <p className="text-sm font-bold text-foreground">{account.label}</p>
                        <p className="truncate text-muted-foreground font-mono">{account.email}</p>
                        <p className="text-muted-foreground font-mono">{account.password}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDemo(account.role)}
                      disabled={demoLoading !== null}
                      className={`${btn.primary} shrink-0`}
                    >
                      {demoLoading === account.role && <Loader2 className="animate-spin" size={16} />}
                      Login as {account.label}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
