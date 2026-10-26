"use client";

import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import SalesChart from "@/components/ui/SalesChart";
import { PageHeader, Section, StatCard } from "@/components/ui/primitives";
import type { AdminReports } from "@/lib/api-types";
import { formatBDT, formatPercent } from "@/lib/format";
import { useConfig } from "@/lib/use-config";
import { useApi } from "@/lib/use-api";

export default function ReportsPage() {
  const reports = useApi<AdminReports>("/admin/reports");
  const config = useConfig();

  return (
    <div className="space-y-6">
      <PageHeader title="Commission statistics" description={`Root Over earns ${config ? formatPercent(config.commissionRate) : "a commission"} of every course sale plus teacher registration fees.`} />
      {!ready(reports) ? <ApiStatus state={reports} /> : <Report data={reports.data} />}
    </div>
  );
}

function Report({ data }: { data: AdminReports }) {
  const { totals } = data;
  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="List value of sales" value={formatBDT(totals.listTotal)} />
        <StatCard label="Discounts" value={formatBDT(totals.discounts)} hint="Course discounts + coupons" />
        <StatCard label="Gross sales" value={formatBDT(totals.gross)} />
        <StatCard label="Teacher earnings" value={formatBDT(totals.teacherNet)} />
        <StatCard label="Course commission" value={formatBDT(totals.commission)} />
        <StatCard label="Registration fees" value={formatBDT(data.registrationFees.total)} />
        <StatCard label="Platform revenue" value={formatBDT(data.platformRevenue)} hint="Commission + registration fees" />
        <StatCard label="Refunds" value={formatBDT(totals.refunds)} hint="Excluded from all totals" />
      </div>

      <Section title="Monthly commission">
        <SalesChart
          data={data.monthly}
          series={[
            { key: "gross", label: "Gross", color: "#00c853" },
            { key: "commission", label: "Commission", color: "#f59e0b" },
            { key: "net", label: "Teacher net", color: "#2563eb" },
          ]}
        />
      </Section>

      <Section title="By teacher">
        <DataTable
          rows={data.byTeacher}
          rowKey={(r) => r.id}
          columns={[
            { header: "Teacher", cell: (r) => <span className="font-semibold">{r.name}</span> },
            { header: "Sales", cell: (r) => r.sales },
            { header: "Gross", cell: (r) => formatBDT(r.gross) },
            { header: "Commission", cell: (r) => formatBDT(r.commission) },
            { header: "Net", cell: (r) => formatBDT(r.teacherNet) },
            { header: "Paid out", cell: (r) => formatBDT(r.withdrawn) },
            { header: "Pending payout", cell: (r) => formatBDT(r.pendingWithdrawals) },
            { header: "Balance owed", cell: (r) => formatBDT(r.teacherNet - r.withdrawn), className: "font-bold" },
          ]}
        />
        <p className="mt-2 text-xs text-muted-foreground">Balance owed = net earnings − paid out (includes pending clearance and pending payouts).</p>
      </Section>

      <Section title="By level">
        <DataTable
          rows={data.byLevel}
          rowKey={(r) => r.level}
          columns={[
            { header: "Level", cell: (r) => <span className="font-semibold">{r.level}</span> },
            { header: "Sales", cell: (r) => r.sales },
            { header: "Gross", cell: (r) => formatBDT(r.gross) },
            { header: "Discounts", cell: (r) => formatBDT(r.discounts) },
            { header: "Commission", cell: (r) => formatBDT(r.commission) },
            { header: "Teacher net", cell: (r) => formatBDT(r.teacherNet) },
          ]}
        />
      </Section>
    </>
  );
}
