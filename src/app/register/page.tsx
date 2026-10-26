"use client";

import { Suspense, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, MailCheck, RotateCcw } from "lucide-react";
import GoogleSignIn from "@/components/GoogleSignIn";
import OtpInput from "@/components/ui/OtpInput";
import PasswordInput from "@/components/ui/PasswordInput";
import { Field } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { ApiError, errorMessage } from "@/lib/api";
import { dashboardPath } from "@/lib/navigation";
import { btn, field, fieldError } from "@/lib/ui";

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <Register />
    </Suspense>
  );
}

// Step 1 creates the account and emails a code; step 2 confirms it and signs in.
// /register?verify=<email> opens step 2 directly (login of an unverified account).
function Register() {
  const searchParams = useSearchParams();
  const verifyParam = searchParams.get("verify");
  const [pending, setPending] = useState<{ email: string; wait: number } | null>(
    verifyParam ? { email: verifyParam, wait: 0 } : null,
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 md:p-8">
        {pending ? (
          <VerifyStep email={pending.email} initialWait={pending.wait} onBack={() => setPending(null)} />
        ) : (
          <SignUpStep onSent={(email, wait) => setPending({ email, wait })} />
        )}
      </div>
    </div>
  );
}

function SignUpStep({ onSent }: { onSent: (email: string, wait: number) => void }) {
  const { register } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (form.password.length < 6) e.password = "Use at least 6 characters.";
    if (form.confirm !== form.password) e.confirm = "Passwords don't match.";
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      const { name, email, password } = form;
      const result = await register({ name, email, password });
      toast.success(`We sent a 6-digit code to ${result.email}.`);
      onSent(result.email, result.resendAvailableIn);
    } catch (err) {
      // Field errors from the server (e.g. "email" already registered) go next to the field
      const fields = err instanceof ApiError ? err.fields : undefined;
      setErrors(fields && Object.keys(fields).length ? fields : { email: errorMessage(err) });
      setLoading(false);
    }
  };

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">Create your account</h1>
      <p className="text-muted-foreground mb-6">
        Every account starts as a student. You can apply to teach later.
      </p>

      <GoogleSignIn
        text="signup_with"
        onSignedIn={(user) => {
          toast.success(`Welcome to Root Over, ${user.name}!`);
          router.push(dashboardPath(user.role));
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {(
          [
            ["name", "Full name", "text", "name"],
            ["email", "Email address", "email", "email"],
            ["password", "Password", "password", "new-password"],
            ["confirm", "Confirm password", "password", "new-password"],
          ] as const
        ).map(([key, label, type, autoComplete]) => {
          const props = {
            id: key,
            autoComplete,
            value: form[key],
            onChange: (e: ChangeEvent<HTMLInputElement>) => set(key)(e.target.value),
            "aria-invalid": !!errors[key],
            className: `${field} ${errors[key] ? fieldError : ""}`,
          };
          return (
            <Field key={key} label={label} htmlFor={key} error={errors[key]}>
              {type === "password" ? <PasswordInput {...props} /> : <input type={type} {...props} />}
            </Field>
          );
        })}

        <button type="submit" disabled={loading} className={`${btn.primary} w-full py-3`}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Login instead
        </Link>
      </p>
    </>
  );
}

function VerifyStep({ email, initialWait, onBack }: { email: string; initialWait: number; onBack: () => void }) {
  const { verifyEmail, resendVerification } = useApp();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(initialWait);

  // Countdown until another code may be requested
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code.");
    setError("");
    setLoading(true);
    try {
      const user = await verifyEmail(email, code);
      toast.success(`Welcome to Root Over, ${user.name}!`);
      // The first account of a new deployment is the admin
      router.push(dashboardPath(user.role));
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const result = await resendVerification(email);
      toast.success(result.message);
      setWait(result.resendAvailableIn);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck size={24} />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">Check your email</h1>
      <p className="text-muted-foreground mb-6">
        Enter the 6-digit code sent to <b className="text-foreground break-all">{email}</b>. It expires in 10 minutes.
      </p>

      <form onSubmit={handleVerify} className="space-y-4" noValidate>
        <Field label="Verification code" htmlFor="code" error={error}>
          <OtpInput
            id="code"
            value={code}
            onChange={(value) => {
              setCode(value);
              setError("");
            }}
            invalid={!!error}
            disabled={loading}
            autoFocus
          />
        </Field>
        <button type="submit" disabled={loading || code.length !== 6} className={`${btn.primary} w-full py-3`}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          {loading ? "Verifying..." : "Verify and continue"}
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
