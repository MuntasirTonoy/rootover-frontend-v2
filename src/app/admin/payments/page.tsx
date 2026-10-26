"use client";

import { useState } from "react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import { PageHeader, SearchInput, SimulatedNotice, StatCard, StatusBadge } from "@/components/ui/primitives";
import { withQuery } from "@/lib/api";
import type { AdminFeeRow, AdminFees } from "@/lib/api-types";
import { formatBDT, formatDateTime, maskNumber } from "@/lib/format";
import { useApi, useDebounced } from "@/lib/use-api";

export default function RegistrationFeesPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim());
  // Newest first; q matches the applicant or the transaction ID. Totals cover every fee.
  const list = useApi<AdminFees>(withQuery("/admin/registration-fees", { q, page, limit: 10 }));

  return (
    <div>
      <PageHeader title="Registration fees" description="One-time ৳300 teacher registration payments." />
      {list.data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <StatCard label="Fees collected" value={formatBDT(list.data.totals.collected)} />
          <StatCard label="Payments" value={list.data.totals.count} />
          <StatCard label="Awaiting payment" value={list.data.totals.awaitingPayment} hint="Applications with Payment Required" />
        </div>
      )}
      <div className="mb-4">
        <SimulatedNotice>All registration fee payments are simulated bKash transactions.</SimulatedNotice>
      </div>
      <SearchInput
        value={query}
        onChange={(v) => {
          setQuery(v);
          setPage(1);
        }}
        placeholder="Search by applicant or transaction ID"
        className="mb-4"
      />
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : (
        <DataTable<AdminFeeRow>
          rows={list.data.data}
          rowKey={(f) => f.id}
          emptyTitle="No registration fees yet"
          serverPage={{ ...list.data.pagination, onPageChange: setPage, loading: list.loading }}
          columns={[
            { header: "Paid at", cell: (f) => <span className="whitespace-nowrap">{formatDateTime(f.paidAt)}</span> },
            {
              header: "Applicant",
              cell: (f) => (
                <div>
                  <p className="font-semibold">{f.applicant.fullName}</p>
                  <p className="text-xs text-muted-foreground">{f.applicant.email}</p>
                </div>
              ),
            },
            { header: "Amount", cell: (f) => <b>{formatBDT(f.amount)}</b> },
            { header: "Method", cell: (f) => `${f.method} ${maskNumber(f.payerNumber)}` },
            { header: "Transaction", cell: (f) => <span className="font-mono text-xs">{f.trxId}</span> },
            { header: "Application", cell: (f) => <StatusBadge status={f.applicationStatus} /> },
          ]}
        />
      )}
    </div>
  );
}
