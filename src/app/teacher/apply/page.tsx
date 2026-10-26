"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSearch,
  Loader2,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import FileInput from "@/components/ui/FileInput";
import PaymentModeNotice from "@/components/ui/PaymentModeNotice";
import { Field, StatusBadge } from "@/components/ui/primitives";
import { useApp, type ApplicationInput } from "@/context/AppStore";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { MyApplication, PaymentStart } from "@/lib/api-types";
import { formatBDT, formatDate, maskNumber } from "@/lib/format";
import { useConfig } from "@/lib/use-config";
import type { ApplicationStatus, RegistrationFee, TeacherApplication } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { btn, field, fieldError } from "@/lib/ui";

const steps: { status: ApplicationStatus; label: string }[] = [
  { status: "pending_review", label: "Admin review" },
  { status: "payment_required", label: "Registration fee" },
  { status: "under_verification", label: "Verification" },
  { status: "approved", label: "Approved" },
];

export default function TeacherApplyPage() {
  const { user, refreshUser } = useApp();
  // The latest application, its fee and (once approved) the teacher profile
  const mine = useApi<MyApplication>("/me/teacher-application");
  const fee = useConfig()?.registrationFee;
  const [reapplying, setReapplying] = useState(false);
  const application = mine.data?.application ?? null;
  const approved = application?.status === "approved";

  // Approval switches the account to the teacher role: reload it so the teacher tools unlock
  useEffect(() => {
    if (approved && user?.role === "student") void refreshUser();
  }, [approved, user?.role, refreshUser]);

  if (!ready(mine)) return <ApiStatus state={mine} />;
  const showForm = !application || (application.status === "rejected" && reapplying);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Become a teacher</h1>
        <p className="text-sm text-muted-foreground">
          Apply, get reviewed, pay the one-time {formatBDT(fee)} registration fee through bKash, and start selling courses.
        </p>
      </div>

      {application && <StatusTracker application={application} />}

      {showForm ? (
        <ApplicationForm
          defaultName={user!.name}
          onSubmitted={() => {
            setReapplying(false);
            mine.reload();
          }}
        />
      ) : application ? (
        <StatusPanel
          application={application}
          fee={mine.data.registrationFee}
          teacherCode={mine.data.teacher?.teacherCode}
          onReapply={() => setReapplying(true)}
        />
      ) : null}
    </div>
  );
}

function StatusTracker({ application }: { application: TeacherApplication }) {
  const current = steps.findIndex((s) => s.status === application.status);
  const rejected = application.status === "rejected";
  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Application submitted {formatDate(application.submittedAt)}
        </p>
        <StatusBadge status={application.status} />
      </div>
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((step, i) => {
          const done = !rejected && current >= i;
          return (
            <li key={step.status} className="text-center">
              <div className={`h-1.5 rounded-full ${done ? "bg-primary" : rejected && i === 0 ? "bg-red-500" : "bg-muted/20"}`} />
              <p className={`mt-2 text-[11px] sm:text-xs font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatusPanel({
  application,
  fee,
  teacherCode,
  onReapply,
}: {
  application: TeacherApplication;
  fee: RegistrationFee | null;
  teacherCode?: string;
  onReapply: () => void;
}) {
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const feeAmount = useConfig()?.registrationFee;

  // Sends the applicant to bKash; the API records the fee once bKash confirms it
  // and returns them to /payment/result, which links back here
  const pay = async () => {
    setPaying(true);
    setError("");
    try {
      const { redirectURL } = await api<PaymentStart>(`/teacher-applications/${application.id}/pay-fee`, {
        method: "POST",
      });
      window.location.assign(redirectURL);
    } catch (err) {
      setError(errorMessage(err));
      setPaying(false);
    }
  };

  const panels: Record<ApplicationStatus, { icon: typeof Clock; title: string; body: React.ReactNode }> = {
    pending_review: {
      icon: FileSearch,
      title: "Your application is being reviewed",
      body: "An admin is checking your details and documents. You'll be asked to pay the registration fee once it passes review.",
    },
    payment_required: {
      icon: CreditCard,
      title: "Pay the registration fee",
      body: (
        <>
          <p>Your application passed the first review. Pay the one-time {formatBDT(feeAmount)} registration fee to continue.</p>
          <button onClick={pay} disabled={paying} className={`${btn.primary} mt-4`}>
            {paying && <Loader2 size={16} className="animate-spin" />}
            {paying ? "Opening bKash..." : `Pay ${formatBDT(feeAmount)} with bKash`}
          </button>
          <div className="mt-3">
            <PaymentModeNotice />
          </div>
          {error && (
            <p className="mt-2 text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
        </>
      ),
    },
    under_verification: {
      icon: Clock,
      title: "Under final verification",
      body: (
        <>
          <p>We received your registration fee. An admin will do a final verification and approve your account.</p>
          {fee && (
            <p className="mt-2 text-xs">
              Paid {formatBDT(fee.amount)} from {maskNumber(fee.payerNumber)} on {formatDate(fee.paidAt)} · Transaction{" "}
              <span className="font-mono">{fee.trxId}</span>
            </p>
          )}
        </>
      ),
    },
    approved: {
      icon: BadgeCheck,
      title: "You're an approved teacher!",
      body: (
        <>
          <p>
            Your Teacher ID is <b className="font-mono text-foreground">{teacherCode}</b>. Your teacher tools are now unlocked.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/teacher/dashboard" className={btn.primary}>
              Open teacher dashboard
            </Link>
            <Link href="/teacher/courses/new" className={btn.secondary}>
              Create your first course
            </Link>
          </div>
        </>
      ),
    },
    rejected: {
      icon: XCircle,
      title: "Your application was rejected",
      body: (
        <>
          {application.reviewNote && <p className="mb-2"><b>Reason:</b> {application.reviewNote}</p>}
          <p>You can fix the issue and apply again.</p>
          <button onClick={onReapply} className={`${btn.primary} mt-4`}>
            Apply again
          </button>
        </>
      ),
    },
  };

  const panel = panels[application.status];
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex gap-4">
        <div
          className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${
            application.status === "rejected" ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"
          }`}
        >
          <panel.icon size={22} />
        </div>
        <div className="text-sm text-muted-foreground">
          <h2 className="mb-1 text-lg font-bold text-foreground">{panel.title}</h2>
          {panel.body}
        </div>
      </div>
    </div>
  );
}

type FormState = ApplicationInput;
type Errors = Partial<Record<keyof FormState, string>>;

function ApplicationForm({ defaultName, onSubmitted }: { defaultName: string; onSubmitted: () => void }) {
  const [form, setForm] = useState<FormState>({
    fullName: defaultName,
    nid: "",
    bkashNumber: "",
    tin: "",
    dateOfBirth: "",
    gender: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const config = useConfig();
  const fee = config?.registrationFee;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Obviously fictional values so nobody types real identity numbers into the
  // demo. Documents still have to be uploaded.
  const fillDemo = () =>
    setForm((f) => ({
      ...f,
      nid: "9990000123456",
      bkashNumber: "01700000999",
      tin: "000000999999",
      dateOfBirth: "1992-04-15",
      gender: "male",
    }));

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.fullName.trim().length < 3) e.fullName = "Enter your full name as on your NID.";
    if (!/^(\d{10}|\d{13}|\d{17})$/.test(form.nid)) e.nid = "NID must be 10, 13 or 17 digits.";
    if (!/^01\d{9}$/.test(form.bkashNumber)) e.bkashNumber = "Enter an 11-digit bKash number starting with 01.";
    if (!/^\d{12}$/.test(form.tin)) e.tin = "TIN must be 12 digits.";
    if (!form.dateOfBirth) e.dateOfBirth = "Enter your date of birth.";
    else if (new Date(form.dateOfBirth).getTime() > Date.now() - 18 * 365.25 * 24 * 3600 * 1000)
      e.dateOfBirth = "You must be at least 18 years old.";
    if (!form.gender) e.gender = "Select your gender.";
    if (!form.photo) e.photo = "Upload a profile photograph.";
    if (!form.sscCertificate) e.sscCertificate = "Upload your SSC certificate.";
    if (!form.hscCertificate) e.hscCertificate = "Upload your HSC certificate.";
    if (!form.fatherVoterId) e.fatherVoterId = "Upload your father's voter ID.";
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      await api("/teacher-applications", {
        method: "POST",
        // Documents are the uploads themselves; the API checks they're this user's
        body: { ...form, fullName: form.fullName.trim() },
      });
      onSubmitted();
      toast.success("Application submitted! An admin will review it soon.");
    } catch (err) {
      // "photo.type" etc. belong to the photo input
      const fields = err instanceof ApiError ? err.fields : undefined;
      if (fields && Object.keys(fields).length) {
        const mapped: Errors = {};
        for (const [key, message] of Object.entries(fields)) mapped[key.split(".")[0] as keyof FormState] ??= message;
        setErrors(mapped);
      }
      toast.error(errorMessage(err));
      setSubmitting(false);
    }
  };

  const text = (key: "fullName" | "nid" | "bkashNumber" | "tin", label: string, opts: { numeric?: boolean; placeholder?: string } = {}) => (
    <Field label={label} htmlFor={key} error={errors[key]}>
      <input
        id={key}
        inputMode={opts.numeric ? "numeric" : undefined}
        placeholder={opts.placeholder}
        value={form[key]}
        onChange={(e) => set(key, opts.numeric ? e.target.value.replace(/\D/g, "") : e.target.value)}
        aria-invalid={!!errors[key]}
        className={`${field} ${errors[key] ? fieldError : ""}`}
      />
    </Field>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-lg border border-border bg-card p-5 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-foreground">Teacher application</h2>
          <p className="text-xs text-muted-foreground">
            {config?.demo
              ? "Demo: use fictional values. Your documents are stored privately and only admins can open them."
              : "Your identity numbers and documents are stored privately and only admins can open them."}
          </p>
        </div>
        {config?.demo && (
          <button type="button" onClick={fillDemo} className={btn.secondary}>
            <Sparkles size={16} /> Fill demo data
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {text("fullName", "Full name")}
        {text("nid", "NID number", { numeric: true, placeholder: "10, 13 or 17 digits" })}
        {text("bkashNumber", "bKash account number", { numeric: true, placeholder: "01XXXXXXXXX" })}
        {text("tin", "TIN number", { numeric: true, placeholder: "12 digits" })}
        <Field label="Date of birth" htmlFor="dob" error={errors.dateOfBirth}>
          <input
            id="dob"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => set("dateOfBirth", e.target.value)}
            aria-invalid={!!errors.dateOfBirth}
            className={`${field} ${errors.dateOfBirth ? fieldError : ""}`}
          />
        </Field>
        <Field label="Gender" htmlFor="gender" error={errors.gender}>
          <select
            id="gender"
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
            aria-invalid={!!errors.gender}
            className={`${field} ${errors.gender ? fieldError : ""}`}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <FileInput label="Profile photograph" purpose="application-doc" accept="image/jpeg,image/png,image/webp" value={form.photo} onChange={(d) => set("photo", d)} error={errors.photo} hint="JPG, PNG or WebP · private, only admins see it" />
        <FileInput label="Father's voter ID" purpose="application-doc" accept="image/jpeg,image/png,image/webp,application/pdf" value={form.fatherVoterId} onChange={(d) => set("fatherVoterId", d)} error={errors.fatherVoterId} hint="Image or PDF" />
        <FileInput label="SSC certificate" purpose="application-doc" accept="application/pdf" value={form.sscCertificate} onChange={(d) => set("sscCertificate", d)} error={errors.sscCertificate} hint="PDF" />
        <FileInput label="HSC certificate" purpose="application-doc" accept="application/pdf" value={form.hscCertificate} onChange={(d) => set("hscCertificate", d)} error={errors.hscCertificate} hint="PDF" />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 size={14} /> After review you&apos;ll pay a one-time {formatBDT(fee)} fee through bKash.
        </p>
        <button type="submit" disabled={submitting} className={btn.primary}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Submit application
        </button>
      </div>
    </form>
  );
}
