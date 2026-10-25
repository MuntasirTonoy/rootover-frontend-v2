"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { Field, PageHeader, Section, SimulatedNotice, StatCard, StatusBadge } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import type { TeacherWithdrawals } from "@/lib/api-types";
import { confirmAction } from "@/lib/confirm";
import { formatBDT, formatDateTime, maskNumber } from "@/lib/format";
import { MIN_WITHDRAWAL } from "@/lib/pricing";
import type { Withdrawal } from "@/lib/types";
import { btn, field, fieldError } from "@/lib/ui";
import { useApi } from "@/lib/use-api";

export default function WithdrawalsPage() {
  const state = useApi<TeacherWithdrawals>("/teacher/withdrawals");
  if (!ready(state)) return <ApiStatus state={state} />;
  return <Withdrawals data={state.data} reload={state.reload} />;
}

// Rendered once the data is in, so the form can start from the default account
function Withdrawals({ data, reload }: { data: TeacherWithdrawals; reload: () => void }) {
  const { finance, withdrawals: history } = data;
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState(data.defaultAccount);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isInteger(value) || value < MIN_WITHDRAWAL) return setError(`Enter a whole amount of at least ${formatBDT(MIN_WITHDRAWAL)}.`);
    if (value > finance.withdrawable) return setError(`You can withdraw up to ${formatBDT(finance.withdrawable)}.`);
    if (!/^01\d{9}$/.test(account)) return setError("Enter an 11-digit bKash number starting with 01.");
    setError("");
    if (!(await confirmAction({ title: `Withdraw ${formatBDT(value)}?`, text: `To bKash ${maskNumber(account)} (simulated payout).`, confirmText: "Request" })))
      return;
    setSubmitting(true);
    try {
      // The API re-checks the balance; it may have changed since this page loaded
      await api("/teacher/withdrawals", { method: "POST", body: { amount: value, accountNumber: account } });
      setAmount("");
      toast.success("Withdrawal requested. An admin will review it.");
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Withdrawals" description="Request payouts of your cleared earnings to bKash." />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Withdrawable balance" value={formatBDT(finance.withdrawable)} icon={Wallet} />
        <StatCard label="Pending withdrawals" value={formatBDT(finance.pendingWithdrawals)} />
        <StatCard label="Withdrawn so far" value={formatBDT(finance.withdrawn)} />
        <StatCard label="Pending clearance" value={formatBDT(finance.pendingClearance)} hint="Not withdrawable yet" />
      </div>

      <Section title="Request a withdrawal">
        <form onSubmit={submit} noValidate className="grid sm:grid-cols-3 gap-4 items-start">
          <Field label="Amount (৳)" htmlFor="amount" hint={`Minimum ${formatBDT(MIN_WITHDRAWAL)}`}>
            <input
              id="amount"
              type="number"
              min={MIN_WITHDRAWAL}
              max={finance.withdrawable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${field} ${error ? fieldError : ""}`}
            />
          </Field>
          <Field label="bKash account" htmlFor="account">
            <input
              id="account"
              inputMode="numeric"
              value={account}
              onChange={(e) => setAccount(e.target.value.replace(/\D/g, "").slice(0, 11))}
              className={field}
            />
          </Field>
          <div className="sm:pt-7 flex gap-2">
            <button type="submit" disabled={submitting || finance.withdrawable < MIN_WITHDRAWAL} className={`${btn.primary} flex-1`}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Request payout
            </button>
            <button type="button" onClick={() => setAmount(String(finance.withdrawable))} className={btn.secondary}>
              Max
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-2 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
        {finance.withdrawable < MIN_WITHDRAWAL && (
          <p className="mt-2 text-sm text-muted-foreground">
            Your withdrawable balance is below the {formatBDT(MIN_WITHDRAWAL)} minimum.
          </p>
        )}
        <div className="mt-4">
          <SimulatedNotice>Payouts are simulated. No money is sent to any bKash account.</SimulatedNotice>
        </div>
      </Section>

      <Section title="Withdrawal history">
        <DataTable<Withdrawal>
          rows={history}
          rowKey={(w) => w.id}
          emptyTitle="No withdrawals yet"
          columns={[
            { header: "Requested", cell: (w) => <span className="whitespace-nowrap">{formatDateTime(w.requestedAt)}</span> },
            { header: "Amount", cell: (w) => <b>{formatBDT(w.amount)}</b> },
            { header: "Account", cell: (w) => <span className="font-mono">bKash {maskNumber(w.accountNumber)}</span> },
            { header: "Status", cell: (w) => <StatusBadge status={w.status} /> },
            { header: "Processed", cell: (w) => (w.processedAt ? formatDateTime(w.processedAt) : "—") },
            { header: "Note", cell: (w) => <span className="text-xs text-muted-foreground">{w.note ?? ""}</span> },
          ]}
        />
      </Section>
    </div>
  );
}
