"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock, PageHeader, StatCard, StatusBadge } from "@/components/ui/primitives";
import type { PurchaseView } from "@/lib/api-types";
import { formatBDT, formatDateTime } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { btn } from "@/lib/ui";

export default function PurchaseHistoryPage() {
  const history = useApi<{ purchases: PurchaseView[]; totals: { count: number; paid: number; saved: number } }>(
    "/me/purchases",
  );
  if (!ready(history)) return <ApiStatus state={history} />;
  // Newest first; totals cover completed purchases only (refunds stay listed)
  const { purchases, totals } = history.data;

  return (
    <div>
      <PageHeader
        title="Purchase History"
        description="Every course you've bought, with its payment details."
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
            <StatCard label="Courses purchased" value={totals.count} />
            <StatCard label="Total paid" value={formatBDT(totals.paid)} />
            <StatCard label="Total saved" value={formatBDT(totals.saved)} hint="Course discounts and coupons" />
          </div>
          <DataTable<PurchaseView>
            rows={purchases}
            rowKey={(p) => p.id}
            columns={[
              { header: "Date", cell: (p) => <span className="whitespace-nowrap">{formatDateTime(p.createdAt)}</span> },
              {
                header: "Course",
                cell: (p) => (
                  <div className="min-w-[180px]">
                    <Link href={`/courses/${p.courseId}`} className="font-semibold hover:text-primary">
                      {p.course.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.teacher.name}</p>
                  </div>
                ),
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
                    <p className="font-semibold">{p.method}</p>
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
