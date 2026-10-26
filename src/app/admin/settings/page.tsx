"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, Percent, ShieldCheck, Wallet } from "lucide-react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import OtpInput from "@/components/ui/OtpInput";
import { Field, PageHeader, Section } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { PlatformSettingsView } from "@/lib/api-types";
import { formatBDT, formatDateTime } from "@/lib/format";
import { btn, field, fieldError } from "@/lib/ui";
import { useApi } from "@/lib/use-api";
import { invalidateConfig } from "@/lib/use-config";

export default function SettingsPage() {
  const settings = useApi<PlatformSettingsView>("/admin/settings");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform settings"
        description="Fees the platform charges. Changes apply to new sales and new fee payments only; past records keep the amounts they were made with."
      />
      {!ready(settings) ? (
        <ApiStatus state={settings} />
      ) : (
        // Re-mounted after a save so the form starts from the saved values
        <SettingsForm key={settings.data.updatedAt} current={settings.data} onSaved={settings.setData} />
      )}
    </div>
  );
}

type Errors = Partial<Record<"commissionPercent" | "registrationFee" | "code" | "form", string>>;

function SettingsForm({ current, onSaved }: { current: PlatformSettingsView; onSaved: (s: PlatformSettingsView) => void }) {
  const [commission, setCommission] = useState(String(current.commissionPercent));
  const [fee, setFee] = useState(String(current.registrationFee));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  // Set once the code is emailed; the values are locked until it's confirmed or cancelled
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const values = { commissionPercent: Number(commission), registrationFee: Number(fee) };
  const changed =
    values.commissionPercent !== current.commissionPercent || values.registrationFee !== current.registrationFee;

  const validate = (): Errors => {
    const e: Errors = {};
    if (commission.trim() === "" || !(values.commissionPercent >= 0 && values.commissionPercent <= 50))
      e.commissionPercent = "Enter a commission from 0 to 50%.";
    else if (Math.round(values.commissionPercent * 100) !== values.commissionPercent * 100)
      e.commissionPercent = "Use at most 2 decimals.";
    if (fee.trim() === "" || !Number.isInteger(values.registrationFee) || values.registrationFee < 0 || values.registrationFee > 100_000)
      e.registrationFee = "Enter a whole fee from ৳0 to ৳100000.";
    return e;
  };

  const fail = (err: unknown) => {
    if (err instanceof ApiError && err.fields) setErrors(err.fields as Errors);
    else setErrors({ form: errorMessage(err) });
  };

  const requestCode = async (e?: FormEvent) => {
    e?.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const r = await api<{ email: string; resendAvailableIn: number }>("/admin/settings/code", {
        method: "POST",
        body: values,
      });
      setSentTo(r.email);
      setCooldown(r.resendAvailableIn);
      setCode("");
      toast.success(`Confirmation code sent to ${r.email}`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setErrors({ code: "Enter the 6-digit code from the email." });
    setBusy(true);
    try {
      const saved = await api<PlatformSettingsView>("/admin/settings", { method: "PUT", body: { ...values, code } });
      invalidateConfig();
      toast.success("Platform settings updated");
      onSaved(saved);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  const cancel = () => {
    setSentTo(null);
    setCode("");
    setErrors({});
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Section title="Fees" className="lg:col-span-2">
        <form onSubmit={requestCode} noValidate className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Sale commission (%)"
              htmlFor="commission"
              error={errors.commissionPercent}
              hint="Share of what the student pays that the platform keeps."
            >
              <div className="relative">
                <input
                  id="commission"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={50}
                  disabled={!!sentTo}
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className={`${field} pr-9 ${errors.commissionPercent ? fieldError : ""}`}
                />
                <Percent size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </Field>
            <Field
              label="Teacher registration fee (৳)"
              htmlFor="fee"
              error={errors.registrationFee}
              hint="One-time fee; paying it approves the teacher."
            >
              <input
                id="fee"
                type="number"
                inputMode="numeric"
                min={0}
                disabled={!!sentTo}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className={`${field} ${errors.registrationFee ? fieldError : ""}`}
              />
            </Field>
          </div>

          {changed && Object.keys(validate()).length === 0 && (
            <div className="rounded-md border border-border bg-surface/60 p-3 text-sm">
              <p className="mb-1.5 font-semibold">You&apos;re changing</p>
              <ul className="space-y-1 text-muted-foreground">
                {values.commissionPercent !== current.commissionPercent && (
                  <li className="flex flex-wrap items-center gap-1.5">
                    Commission: {current.commissionPercent}% <ArrowRight size={13} />
                    <b className="text-foreground">{values.commissionPercent}%</b>
                  </li>
                )}
                {values.registrationFee !== current.registrationFee && (
                  <li className="flex flex-wrap items-center gap-1.5">
                    Registration fee: {formatBDT(current.registrationFee)} <ArrowRight size={13} />
                    <b className="text-foreground">{formatBDT(values.registrationFee)}</b>
                  </li>
                )}
              </ul>
            </div>
          )}

          {!sentTo && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={busy || !changed} className={btn.primary}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Send confirmation code
              </button>
              {!changed && <span className="text-xs text-muted-foreground">Change a value to save it.</span>}
            </div>
          )}
          {errors.form && !sentTo && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {errors.form}
            </p>
          )}
        </form>

        {sentTo && (
          <form onSubmit={confirm} noValidate className="mt-5 space-y-4 border-t border-border pt-5">
            <div>
              <p className="text-sm font-semibold">Enter the code we emailed you</p>
              <p className="text-xs text-muted-foreground">
                Sent to <b className="text-foreground">{sentTo}</b>. It expires in 10 minutes.
              </p>
            </div>
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                setErrors({});
              }}
              invalid={!!errors.code}
              disabled={busy}
              autoFocus
            />
            {(errors.code || errors.form) && (
              <p className="text-sm font-medium text-red-600" role="alert">
                {errors.code ?? errors.form}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={busy || code.length !== 6} className={btn.primary}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Confirm and save
              </button>
              <button type="button" onClick={cancel} disabled={busy} className={btn.secondary}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => requestCode()}
                disabled={busy || cooldown > 0}
                className={`${btn.ghost} ml-auto`}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </Section>

      <Section title="Currently in force">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Percent size={15} /> Sale commission
            </dt>
            <dd className="font-bold">{current.commissionPercent}%</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Wallet size={15} /> Registration fee
            </dt>
            <dd className="font-bold">{formatBDT(current.registrationFee)}</dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          Last changed {formatDateTime(current.updatedAt)}
          {current.updatedBy && <> by {current.updatedBy}</>}. Every change is recorded in the activity log.
        </p>
      </Section>
    </div>
  );
}
