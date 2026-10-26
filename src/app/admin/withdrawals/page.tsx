"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { FilterSelect, Notice, PageHeader, StatCard, StatusBadge } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import type { AdminWithdrawalRow, AdminWithdrawals } from "@/lib/api-types";
import { confirmAction, promptReason } from "@/lib/confirm";
import { formatBDT, formatDateTime } from "@/lib/format";
import { btn } from "@/lib/ui";
import { useApi } from "@/lib/use-api";

export default function AdminWithdrawalsPage() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  // status is always sent: "" means every status (no status at all means pending), so withQuery can't be used
  const params = new URLSearchParams({ status, page: String(page), limit: "10" });
  const list = useApi<AdminWithdrawals>(`/admin/withdrawals?${params}`);
  const sums = list.data?.sums;

  // Sums and balances change with every decision, so the list is reloaded
  const process = async (w: AdminWithdrawalRow, action: "approve" | "reject", reason?: string) => {
    try {
      await api(`/admin/withdrawals/${w.id}/${action}`, { method: "POST", body: reason ? { reason } : undefined });
      toast.success(action === "approve" ? "Withdrawal marked as paid" : "Withdrawal rejected; the amount returns to the teacher's balance");
    } catch (err) {
      toast.error(errorMessage(err));
    }
    list.reload();
  };

  const approve = async (w: AdminWithdrawalRow) => {
    if (await confirmAction({ title: `Pay ${formatBDT(w.amount)} to ${w.teacher.name}?`, text: `Send the money to bKash ${w.accountNumber} first: approving only records the payout.`, confirmText: "Mark as paid" }))
      await process(w, "approve");
  };

  const reject = async (w: AdminWithdrawalRow) => {
    const reason = await promptReason({ title: "Reject this withdrawal?", placeholder: "Shown to the teacher", confirmText: "Reject" });
    if (reason) await process(w, "reject", reason);
  };

  return (
    <div>
      <PageHeader title="Withdrawals" description="Teacher payout requests. Rejected amounts go back to the teacher's withdrawable balance." />
      {sums && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <StatCard label="Pending" value={formatBDT(sums.pending.amount)} hint={`${sums.pending.count} requests`} />
          <StatCard label="Paid out" value={formatBDT(sums.approved.amount)} />
          <StatCard label="Rejected" value={formatBDT(sums.rejected.amount)} />
        </div>
      )}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Notice>Payouts aren&apos;t automatic: send the money by bKash, then approve to record it.</Notice>
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </div>
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<AdminWithdrawalRow>
          rows={list.data.data}
          rowKey={(w) => w.id}
          emptyTitle="No withdrawals"
          serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
          columns={[
            { header: "Requested", cell: (w) => <span className="whitespace-nowrap text-xs">{formatDateTime(w.requestedAt)}</span> },
            {
              header: "Teacher",
              cell: (w) => (
                <div>
                  <p className="font-semibold">{w.teacher.name}</p>
                  <p className="text-xs text-muted-foreground">Withdrawable now: {formatBDT(w.withdrawable)}</p>
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
      )}
    </div>
  );
}
