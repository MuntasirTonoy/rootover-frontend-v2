"use client";

import { useState } from "react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import { FilterSelect, PageHeader, SearchInput, StatCard, StatusBadge } from "@/components/ui/primitives";
import { withQuery } from "@/lib/api";
import type { AdminTransactions, PurchaseView } from "@/lib/api-types";
import { formatBDT, formatDateTime } from "@/lib/format";
import { useApi, useDebounced } from "@/lib/use-api";

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<PurchaseView | null>(null);
  const q = useDebounced(query.trim());
  // Newest first; q matches the transaction ID, course, student or teacher. Totals follow the filters.
  const list = useApi<AdminTransactions>(withQuery("/admin/transactions", { status, method, q, page, limit: 10 }));
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };
  const totals = list.data?.totals;

  return (
    <div>
      <PageHeader title="Transactions" description="Course purchases and refunds (simulated). Totals follow the filters below." />
      {totals && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard label="Gross sales" value={formatBDT(totals.gross)} hint={`${totals.sales} completed`} />
          <StatCard label="Commission (10%)" value={formatBDT(totals.commission)} />
          <StatCard label="Teacher earnings" value={formatBDT(totals.teacherNet)} />
          <StatCard label="Refunded" value={formatBDT(totals.refunds)} hint={`${totals.refundedCount} refunds, excluded above`} />
        </div>
      )}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <SearchInput value={query} onChange={filter(setQuery)} placeholder="Search by transaction, course, student or teacher" className="flex-1" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={filter(setStatus)}
          options={[
            { value: "", label: "All statuses" },
            { value: "completed", label: "Completed" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
        <FilterSelect
          label="Method"
          value={method}
          onChange={filter(setMethod)}
          options={[{ value: "", label: "All methods" }, ...["bKash", "Nagad", "Card"].map((m) => ({ value: m, label: m }))]}
        />
      </div>
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<PurchaseView>
          rows={list.data.data}
          rowKey={(p) => p.id}
          onRowClick={setViewing}
          emptyTitle="No transactions match"
          serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
          columns={[
            { header: "Date", cell: (p) => <span className="whitespace-nowrap text-xs">{formatDateTime(p.createdAt)}</span> },
            { header: "Transaction", cell: (p) => <span className="font-mono text-xs">{p.trxId}</span> },
            {
              header: "Course",
              cell: (p) => (
                <div className="min-w-[180px]">
                  <p className="font-semibold line-clamp-1">{p.course.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.student.name} → {p.teacher.name}
                  </p>
                </div>
              ),
            },
            { header: "Paid", cell: (p) => <b>{formatBDT(p.amountPaid)}</b> },
            { header: "Commission", cell: (p) => formatBDT(p.commission) },
            { header: "Teacher net", cell: (p) => formatBDT(p.teacherNet) },
            { header: "Method", cell: (p) => p.method },
            { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
          ]}
        />
      )}

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={`Transaction ${viewing.trxId}`} size="md">
          <dl className="space-y-2 text-sm">
            {(
              [
                ["Date", formatDateTime(viewing.createdAt)],
                ["Course", viewing.course.title],
                ["Student", `${viewing.student.name} (${viewing.student.email})`],
                ["Teacher", viewing.teacher.name],
                ["List price", formatBDT(viewing.listPrice)],
                ["Course discount", `-${formatBDT(viewing.listPrice - viewing.coursePrice)}`],
                ["Coupon", viewing.couponCode ? `${viewing.couponCode} (-${formatBDT(viewing.couponDiscount)})` : "None"],
                ["Amount paid", formatBDT(viewing.amountPaid)],
                ["Platform commission", formatBDT(viewing.commission)],
                ["Teacher net", formatBDT(viewing.teacherNet)],
                ["Method", `${viewing.method} (simulated)`],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={viewing.status} />
              </dd>
            </div>
          </dl>
        </Modal>
      )}
    </div>
  );
}
