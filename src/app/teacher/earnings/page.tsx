"use client";

import { useState } from "react";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import SalesChart from "@/components/ui/SalesChart";
import { FilterSelect, PageHeader, Section, StatCard, StatusBadge } from "@/components/ui/primitives";
import { formatBDT, formatDateTime } from "@/lib/format";
import { useConfig } from "@/lib/use-config";
import { withQuery } from "@/lib/api";
import type { PurchaseView, TeacherCourseRow, TeacherEarnings } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";

export default function EarningsPage() {
  const [courseId, setCourseId] = useState("");
  const [page, setPage] = useState(1);
  const courses = useApi<TeacherCourseRow[]>("/teacher/courses").data ?? [];
  const config = useConfig();
  // Finance and the chart cover every sale; courseId and page only change the transactions
  const earnings = useApi<TeacherEarnings>(withQuery("/teacher/earnings", { courseId, page, limit: 10 }));
  if (!ready(earnings)) return <ApiStatus state={earnings} />;
  const { finance, monthly, transactions } = earnings.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" description={`Your sales and balance. The platform commission is ${config ? `${config.commissionRate * 100}%` : "a share"} of what the student paid.`} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="List value of sales" value={formatBDT(finance.listTotal)} hint={`${finance.sales} sales before discounts`} />
        <StatCard label="Discounts given" value={formatBDT(finance.discounts)} hint="Course discounts + coupons" />
        <StatCard label="Gross sales" value={formatBDT(finance.gross)} hint="Amount students paid" />
        <StatCard label={config ? `Platform fee (${config.commissionRate * 100}%)` : "Platform fee"} value={formatBDT(finance.commission)} />
      </div>

      <Section title="Where your net earnings are">
        <p className="mb-4 text-sm text-muted-foreground">
          Net earnings of <b className="text-foreground">{formatBDT(finance.teacherNet)}</b> are split into:
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Pending clearance", value: finance.pendingClearance, hint: `Sales from the last ${config?.clearingDays ?? "few"} days` },
            { label: "Pending withdrawals", value: finance.pendingWithdrawals, hint: "Requested, awaiting admin" },
            { label: "Withdrawn", value: finance.withdrawn, hint: "Paid out to bKash" },
            { label: "Withdrawable", value: finance.withdrawable, hint: "Available to request now" },
          ].map((item) => (
            <div key={item.label} className="rounded-md border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-extrabold">{formatBDT(item.value)}</p>
              <p className="text-[11px] text-muted-foreground">{item.hint}</p>
            </div>
          ))}
        </div>
        {finance.refundedCount > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {finance.refundedCount} refunded sale{finance.refundedCount === 1 ? "" : "s"} ({formatBDT(finance.refunds)}) are excluded.
          </p>
        )}
      </Section>

      <Section title="Monthly earnings">
        <SalesChart
          data={monthly}
          series={[
            { key: "gross", label: "Gross", color: "#00c853" },
            { key: "commission", label: "Commission", color: "#f59e0b" },
            { key: "net", label: "Net", color: "#2563eb" },
          ]}
        />
      </Section>

      <Section
        title="Transactions"
        action={
          <FilterSelect
            label="Course"
            value={courseId}
            onChange={(v) => {
              setCourseId(v);
              setPage(1);
            }}
            options={[{ value: "", label: "All courses" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]}
          />
        }
      >
        <DataTable<PurchaseView>
          rows={transactions.data}
          rowKey={(p) => p.id}
          emptyTitle="No sales yet"
          serverPage={{ ...transactions.pagination, onPageChange: setPage, loading: earnings.loading }}
          columns={[
            { header: "Date", cell: (p) => <span className="whitespace-nowrap text-xs">{formatDateTime(p.createdAt)}</span> },
            {
              header: "Course / student",
              cell: (p) => (
                <div className="min-w-[180px]">
                  <p className="font-semibold line-clamp-1">{p.course.title}</p>
                  <p className="text-xs text-muted-foreground">{p.student.name}</p>
                </div>
              ),
            },
            { header: "List", cell: (p) => formatBDT(p.listPrice) },
            {
              header: "Discount",
              cell: (p) => (
                <div>
                  {formatBDT(p.listPrice - p.amountPaid)}
                  {p.couponCode && <p className="font-mono text-[11px] text-primary">{p.couponCode}</p>}
                </div>
              ),
            },
            { header: "Paid", cell: (p) => formatBDT(p.amountPaid) },
            { header: "Fee", cell: (p) => <span className="text-amber-600">-{formatBDT(p.commission)}</span> },
            { header: "Net", cell: (p) => <b>{formatBDT(p.teacherNet)}</b> },
            { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
          ]}
        />
      </Section>
    </div>
  );
}
