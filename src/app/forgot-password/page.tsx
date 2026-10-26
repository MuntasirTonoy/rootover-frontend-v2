"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, KeyRound, Loader2, MailCheck, RotateCcw } from "lucide-react";
import OtpInput from "@/components/ui/OtpInput";
import PasswordInput from "@/components/ui/PasswordInput";
import { Field } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { ApiError, errorMessage } from "@/lib/api";
import { btn, field, fieldError } from "@/lib/ui";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <ForgotPassword />
    </Suspense>
  );
}

// Step 1 emails a reset code; step 2 takes the code and a new password.
// /forgot-password?email=<email> pre-fills step 1 (from the login form).
function ForgotPassword() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<{ email: string; wait: number } | null>(null);

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 md:p-8">
        {pending ? (
          <ResetStep email={pending.email} initialWait={pending.wait} onBack={() => setPending(null)} />
        ) : (
          <RequestStep
            initialEmail={searchParams.get("email") ?? ""}
            onSent={(email, wait) => setPending({ email, wait })}
          />
        )}
      </div>
    </div>
  );
}

function RequestStep({
  initialEmail,
  onSent,
}: {
  initialEmail: string;
  onSent: (email: string, wait: number) => void;
}) {
  const { forgotPassword } = useApp();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) return setError("Enter a valid email address.");
    setError("");
    setLoading(true);
    try {
      // The answer is the same whether or not the account exists
      const result = await forgotPassword(trimmed);
      toast.success(result.message);
      onSent(trimmed, result.resendAvailableIn);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <KeyRound size={24} />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">Forgot your password?</h1>
      <p className="text-muted-foreground mb-6">
        Enter your account&apos;s email and we&apos;ll send you a 6-digit code to set a new password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email address" htmlFor="email" error={error}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            className={`${field} ${error ? fieldError : ""}`}
          />
        </Field>
        <button type="submit" disabled={loading || !email.trim()} className={`${btn.primary} w-full py-3`}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          {loading ? "Sending code..." : "Send reset code"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </>
  );
}

interface ResetErrors {
  code?: string;
  password?: string;
  confirm?: string;
}

function ResetStep({ email, initialWait, onBack }: { email: string; initialWait: number; onBack: () => void }) {
  const { forgotPassword, resetPassword } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ code: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<ResetErrors>({});
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(initialWait);

  // Countdown until another code may be requested
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const validate = (): ResetErrors => {
    const e: ResetErrors = {};
    if (!/^\d{6}$/.test(form.code)) e.code = "Enter the 6-digit code.";
    if (form.password.length < 6) e.password = "Use at least 6 characters.";
    if (form.confirm !== form.password) e.confirm = "Passwords don't match.";
    return e;
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      const result = await resetPassword({ email, code: form.code, password: form.password });
      toast.success(result.message);
      router.push("/login");
    } catch (err) {
      // A wrong or expired code is reported on the code field
      const fields = err instanceof ApiError ? err.fields : undefined;
      setErrors(fields && Object.keys(fields).length ? fields : { code: errorMessage(err) });
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const result = await forgotPassword(email);
      toast.success(result.message);
      setWait(result.resendAvailableIn);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck size={24} />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">Set a new password</h1>
      <p className="text-muted-foreground mb-6">
        If an account exists for <b className="text-foreground break-all">{email}</b>, we sent it a 6-digit code. It
        expires in 10 minutes.
      </p>

      <form onSubmit={handleReset} className="space-y-4" noValidate>
        <Field label="Reset code" htmlFor="code" error={errors.code}>
          <OtpInput
            id="code"
            value={form.code}
            onChange={(value) => {
              set("code")(value);
              setErrors((e) => ({ ...e, code: undefined }));
            }}
            invalid={!!errors.code}
            disabled={loading}
            autoFocus
          />
        </Field>
        {(
          [
            ["password", "New password"],
            ["confirm", "Confirm new password"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label} htmlFor={key} error={errors[key]}>
            <PasswordInput
              id={key}
              autoComplete="new-password"
              value={form[key]}
              onChange={(e) => set(key)(e.target.value)}
              aria-invalid={!!errors[key]}
              className={`${field} ${errors[key] ? fieldError : ""}`}
            />
          </Field>
        ))}
        <p className="text-xs text-muted-foreground">
          Resetting signs this account out on every device.
        </p>
        <button type="submit" disabled={loading || form.code.length !== 6} className={`${btn.primary} w-full py-3`}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          {loading ? "Saving..." : "Reset password"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" onClick={onBack} className="font-semibold text-muted-foreground hover:text-foreground">
          Use a different email
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={wait > 0}
          className="inline-flex items-center gap-1 font-bold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          <RotateCcw size={14} />
          {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
        </button>
      </div>
    </>
  );
}
