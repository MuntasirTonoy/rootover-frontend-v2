"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { FilterSelect, PageHeader, SimulatedNotice, StatCard, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { confirmAction, promptReason } from "@/lib/confirm";
import { formatBDT, formatDateTime } from "@/lib/format";
import { teacherFinance, teacherInfo } from "@/lib/selectors";
import type { Withdrawal } from "@/lib/types";
import { btn } from "@/lib/ui";

export default function AdminWithdrawalsPage() {
  const { db, processWithdrawal } = useApp();
  const [status, setStatus] = useState("pending");
  const rows = db.withdrawals
    .filter((w) => !status || w.status === status)
    .sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending") || b.requestedAt.localeCompare(a.requestedAt));
  const sum = (s: Withdrawal["status"]) => db.withdrawals.filter((w) => w.status === s).reduce((t, w) => t + w.amount, 0);

  const approve = async (w: Withdrawal) => {
    const name = teacherInfo(db, w.teacherId)?.name;
    if (await confirmAction({ title: `Pay ${formatBDT(w.amount)} to ${name}?`, text: `Simulated bKash payout to ${w.accountNumber}.`, confirmText: "Approve" })) {
      processWithdrawal(w.id, "approved");
      toast.success("Withdrawal approved (simulated payout)");
    }
  };

  const reject = async (w: Withdrawal) => {
    const reason = await promptReason({ title: "Reject this withdrawal?", placeholder: "Shown to the teacher", confirmText: "Reject" });
    if (!reason) return;
    processWithdrawal(w.id, "rejected", reason);
    toast.success("Withdrawal rejected; the amount returns to the teacher's balance");
  };

  return (
    <div>
      <PageHeader title="Withdrawals" description="Teacher payout requests. Rejected amounts go back to the teacher's withdrawable balance." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Pending" value={formatBDT(sum("pending"))} hint={`${db.withdrawals.filter((w) => w.status === "pending").length} requests`} />
        <StatCard label="Paid out" value={formatBDT(sum("approved"))} />
        <StatCard label="Rejected" value={formatBDT(sum("rejected"))} />
      </div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SimulatedNotice>Approving a withdrawal doesn&apos;t send real money.</SimulatedNotice>
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </div>
      <DataTable<Withdrawal>
        rows={rows}
        rowKey={(w) => w.id}
        emptyTitle="No withdrawals"
        columns={[
          { header: "Requested", cell: (w) => <span className="whitespace-nowrap text-xs">{formatDateTime(w.requestedAt)}</span> },
          {
            header: "Teacher",
            cell: (w) => (
              <div>
                <p className="font-semibold">{teacherInfo(db, w.teacherId)?.name}</p>
                <p className="text-xs text-muted-foreground">Withdrawable now: {formatBDT(teacherFinance(db, w.teacherId).withdrawable)}</p>
              </div>
            ),
          },
          { header: "Amount", cell: (w) => <b>{formatBDT(w.amount)}</b> },
          { header: "bKash", cell: (w) => <span className="font-mono text-xs">{w.accountNumber}</span> },
          {
            header: "Status",
            cell: (w) => (
              <div>
                <StatusBadge status={w.status} />
                {w.note && <p className="mt-1 max-w-[200px] text-xs text-muted-foreground line-clamp-2">{w.note}</p>}
              </div>
            ),
          },
          {
            header: "Actions",
            className: "text-right",
            cell: (w) =>
              w.status === "pending" ? (
                <div className="flex justify-end gap-1">
                  <button onClick={() => approve(w)} className={`${btn.small} text-green-700 dark:text-green-400`}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button onClick={() => reject(w)} className={`${btn.small} text-red-600`}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{w.processedAt && formatDateTime(w.processedAt)}</span>
              ),
          },
        ]}
      />
    </div>
  );
}
