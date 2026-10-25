"use client";

import DataTable from "@/components/ui/DataTable";
import SalesChart from "@/components/ui/SalesChart";
import { PageHeader, Section, StatCard } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatBDT } from "@/lib/format";
import { COMMISSION_RATE } from "@/lib/pricing";
import { monthlySeries, salesTotals, teacherFinance, teacherInfo } from "@/lib/selectors";
import { LEVELS } from "@/lib/types";

export default function ReportsPage() {
  const { db } = useApp();
  const totals = salesTotals(db.purchases);
  const fees = db.registrationFees.reduce((s, f) => s + f.amount, 0);

  const byTeacher = db.teachers.map((t) => ({ id: t.id, name: teacherInfo(db, t.id)?.name ?? t.id, ...teacherFinance(db, t.id) }));
  const byLevel = LEVELS.map((level) => {
    const ids = new Set(db.courses.filter((c) => c.level === level).map((c) => c.id));
    return { level, ...salesTotals(db.purchases.filter((p) => ids.has(p.courseId))) };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Commission reports" description={`Root Over earns ${COMMISSION_RATE * 100}% of every course sale plus teacher registration fees.`} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="List value of sales" value={formatBDT(totals.listTotal)} />
        <StatCard label="Discounts" value={formatBDT(totals.discounts)} hint="Course discounts + coupons" />
        <StatCard label="Gross sales" value={formatBDT(totals.gross)} />
        <StatCard label="Teacher earnings" value={formatBDT(totals.teacherNet)} />
        <StatCard label="Course commission" value={formatBDT(totals.commission)} />
        <StatCard label="Registration fees" value={formatBDT(fees)} />
        <StatCard label="Platform revenue" value={formatBDT(totals.commission + fees)} hint="Commission + registration fees" />
        <StatCard label="Refunds" value={formatBDT(totals.refunds)} hint="Excluded from all totals" />
      </div>

      <Section title="Monthly commission">
        <SalesChart
          data={monthlySeries(db.purchases)}
          series={[
            { key: "gross", label: "Gross", color: "#00c853" },
            { key: "commission", label: "Commission", color: "#f59e0b" },
            { key: "net", label: "Teacher net", color: "#2563eb" },
          ]}
        />
      </Section>

      <Section title="By teacher">
        <DataTable
          rows={byTeacher}
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
          rows={byLevel}
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
    </div>
  );
}
