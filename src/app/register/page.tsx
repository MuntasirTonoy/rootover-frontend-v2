"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Field } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { btn, field, fieldError } from "@/lib/ui";

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function RegisterPage() {
  const { register } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email address.";
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
    await new Promise((r) => setTimeout(r, 400));
    try {
      register(form);
      toast.success("Account created! Welcome to Root Over.");
      router.push("/dashboard");
    } catch (err) {
      setErrors({ email: (err as Error).message });
      setLoading(false);
    }
  };

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1">Create your account</h1>
        <p className="text-muted-foreground mb-6">
          Every account starts as a student. You can apply to teach later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {(
            [
              ["name", "Full name", "text", "name"],
              ["email", "Email address", "email", "email"],
              ["password", "Password", "password", "new-password"],
              ["confirm", "Confirm password", "password", "new-password"],
            ] as const
          ).map(([key, label, type, autoComplete]) => (
            <Field key={key} label={label} htmlFor={key} error={errors[key]}>
              <input
                id={key}
                type={type}
                autoComplete={autoComplete}
                value={form[key]}
                onChange={(e) => set(key)(e.target.value)}
                aria-invalid={!!errors[key]}
                className={`${field} ${errors[key] ? fieldError : ""}`}
              />
            </Field>
          ))}

          <button type="submit" disabled={loading} className={`${btn.primary} w-full py-3`}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Demo only: accounts are stored in this browser and are not secure.
        </p>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Login instead
          </Link>
        </p>
      </div>
    </div>
  );
}
