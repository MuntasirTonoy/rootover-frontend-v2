"use client";

import { useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { PageHeader, SearchInput, SimulatedNotice, StatCard, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatBDT, formatDateTime, maskNumber } from "@/lib/format";
import { getUser } from "@/lib/selectors";
import type { RegistrationFee } from "@/lib/types";

export default function RegistrationFeesPage() {
  const { db } = useApp();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = db.registrationFees
    .filter((f) => {
      const app = db.applications.find((a) => a.id === f.applicationId);
      return !q || (app?.fullName ?? "").toLowerCase().includes(q) || f.trxId.toLowerCase().includes(q);
    })
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const awaiting = db.applications.filter((a) => a.status === "payment_required").length;

  return (
    <div>
      <PageHeader title="Registration fees" description="One-time ৳300 teacher registration payments." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Fees collected" value={formatBDT(db.registrationFees.reduce((s, f) => s + f.amount, 0))} />
        <StatCard label="Payments" value={db.registrationFees.length} />
        <StatCard label="Awaiting payment" value={awaiting} hint="Applications with Payment Required" />
      </div>
      <div className="mb-4">
        <SimulatedNotice>All registration fee payments are simulated bKash transactions.</SimulatedNotice>
      </div>
      <SearchInput value={query} onChange={setQuery} placeholder="Search by applicant or transaction ID" className="mb-4" />
      <DataTable<RegistrationFee>
        rows={rows}
        rowKey={(f) => f.id}
        emptyTitle="No registration fees yet"
        columns={[
          { header: "Paid at", cell: (f) => <span className="whitespace-nowrap">{formatDateTime(f.paidAt)}</span> },
          {
            header: "Applicant",
            cell: (f) => (
              <div>
                <p className="font-semibold">{db.applications.find((a) => a.id === f.applicationId)?.fullName}</p>
                <p className="text-xs text-muted-foreground">{getUser(db, f.userId)?.email}</p>
              </div>
            ),
          },
          { header: "Amount", cell: (f) => <b>{formatBDT(f.amount)}</b> },
          { header: "Method", cell: (f) => `${f.method} ${maskNumber(f.payerNumber)}` },
          { header: "Transaction", cell: (f) => <span className="font-mono text-xs">{f.trxId}</span> },
          {
            header: "Application",
            cell: (f) => {
              const app = db.applications.find((a) => a.id === f.applicationId);
              return app ? <StatusBadge status={app.status} /> : "—";
            },
          },
        ]}
      />
    </div>
  );
}
