"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { EmptyBlock, PageHeader, StatCard, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatBDT, formatDateTime } from "@/lib/format";
import { getCourse, teacherInfo } from "@/lib/selectors";
import type { Purchase } from "@/lib/types";
import { btn } from "@/lib/ui";

export default function PurchaseHistoryPage() {
  const { db, user } = useApp();
  const purchases = db.purchases
    .filter((p) => p.studentId === user!.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const completed = purchases.filter((p) => p.status === "completed");
  const saved = completed.reduce((s, p) => s + p.listPrice - p.amountPaid, 0);

  return (
    <div>
      <PageHeader
        title="Purchase History"
        description="All payments here were simulated for the demo. No real money was charged."
      />

      {purchases.length === 0 ? (
        <EmptyBlock
          icon={Receipt}
          title="No purchases yet"
          action={
            <Link href="/courses" className={btn.primary}>
              Browse courses
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Courses purchased" value={completed.length} />
            <StatCard label="Total paid" value={formatBDT(completed.reduce((s, p) => s + p.amountPaid, 0))} />
            <StatCard label="Total saved" value={formatBDT(saved)} hint="Course discounts and coupons" />
          </div>
          <DataTable<Purchase>
            rows={purchases}
            rowKey={(p) => p.id}
            columns={[
              { header: "Date", cell: (p) => <span className="whitespace-nowrap">{formatDateTime(p.createdAt)}</span> },
              {
                header: "Course",
                cell: (p) => {
                  const course = getCourse(db, p.courseId);
                  return (
                    <div className="min-w-[180px]">
                      <Link href={`/courses/${p.courseId}`} className="font-semibold hover:text-primary">
                        {course?.title ?? "Removed course"}
                      </Link>
                      <p className="text-xs text-muted-foreground">{teacherInfo(db, p.teacherId)?.name}</p>
                    </div>
                  );
                },
              },
              { header: "List price", cell: (p) => formatBDT(p.listPrice) },
              {
                header: "Discount",
                cell: (p) => (
                  <div>
                    {formatBDT(p.listPrice - p.amountPaid)}
                    {p.couponCode && <p className="text-xs text-primary font-mono">{p.couponCode}</p>}
                  </div>
                ),
              },
              { header: "Paid", cell: (p) => <b>{formatBDT(p.amountPaid)}</b> },
              {
                header: "Payment",
                cell: (p) => (
                  <div className="text-xs">
                    <p className="font-semibold">{p.method} (simulated)</p>
                    <p className="font-mono text-muted-foreground">{p.trxId}</p>
                  </div>
                ),
              },
              { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
            ]}
          />
        </>
      )}
    </div>
  );
}
