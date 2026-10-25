"use client";

import Link from "next/link";
import { BookOpen, ClipboardCheck, Coins, GraduationCap, Receipt, RotateCcw, Users, Wallet } from "lucide-react";
import SalesChart from "@/components/ui/SalesChart";
import { PageHeader, Section, StatCard, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { confirmAction } from "@/lib/confirm";
import { formatBDT, formatDate, formatDateTime } from "@/lib/format";
import { monthlySeries, salesTotals, studentsOf, teacherInfo } from "@/lib/selectors";
import { btn } from "@/lib/ui";

export default function AdminDashboard() {
  const { db, resetDemo } = useApp();
  const totals = salesTotals(db.purchases);
  const feeRevenue = db.registrationFees.reduce((s, f) => s + f.amount, 0);
  const pendingApps = db.applications.filter((a) => ["pending_review", "under_verification"].includes(a.status));
  const pendingCourses = db.courses.filter((c) => c.status === "pending");
  const pendingWithdrawals = db.withdrawals.filter((w) => w.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin overview"
        description="Platform activity. All money figures are simulated demo data."
        actions={
          <button
            onClick={async () => {
              if (await confirmAction({ title: "Reset all demo data?", text: "Every change made in this browser will be lost.", danger: true, confirmText: "Reset" }))
                resetDemo();
            }}
            className={btn.secondary}
          >
            <RotateCcw size={16} /> Reset demo data
          </button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Students" value={studentsOf(db).length} icon={Users} />
        <StatCard label="Teachers" value={db.teachers.length} icon={GraduationCap} />
        <StatCard
          label="Live courses"
          value={db.courses.filter((c) => c.status === "approved").length}
          icon={BookOpen}
          hint={`${pendingCourses.length} awaiting approval`}
        />
        <StatCard label="Course sales" value={totals.sales} icon={Receipt} hint={`${totals.refundedCount} refunded`} />
        <StatCard label="Gross sales" value={formatBDT(totals.gross)} icon={Coins} hint="Paid by students" />
        <StatCard label="Platform commission" value={formatBDT(totals.commission)} hint="10% of gross sales" />
        <StatCard label="Teacher earnings" value={formatBDT(totals.teacherNet)} hint="Gross minus commission" />
        <StatCard label="Registration fees" value={formatBDT(feeRevenue)} icon={Wallet} hint={`${db.registrationFees.length} payments`} />
      </div>

      <Section title="Sales and commission (last 6 months)">
        <SalesChart
          data={monthlySeries(db.purchases)}
          series={[
            { key: "gross", label: "Gross sales", color: "#00c853" },
            { key: "commission", label: "Commission", color: "#f59e0b" },
          ]}
        />
      </Section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Section
          title={`Applications to review (${pendingApps.length})`}
          action={<Link href="/admin/teacher-applications" className="text-xs font-bold text-primary hover:underline">Review</Link>}
        >
          {pendingApps.length ? (
            <ul className="divide-y divide-border">
              {pendingApps.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="truncate font-semibold">{a.fullName}</span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing waiting.</p>
          )}
        </Section>

        <Section
          title={`Courses to approve (${pendingCourses.length})`}
          action={<Link href="/admin/courses?status=pending" className="text-xs font-bold text-primary hover:underline">Review</Link>}
        >
          {pendingCourses.length ? (
            <ul className="divide-y divide-border">
              {pendingCourses.slice(0, 5).map((c) => (
                <li key={c.id} className="py-2 text-sm">
                  <p className="truncate font-semibold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {teacherInfo(db, c.teacherId)?.name} · {formatDate(c.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing waiting.</p>
          )}
        </Section>

        <Section
          title={`Withdrawals to process (${pendingWithdrawals.length})`}
          action={<Link href="/admin/withdrawals" className="text-xs font-bold text-primary hover:underline">Process</Link>}
        >
          {pendingWithdrawals.length ? (
            <ul className="divide-y divide-border">
              {pendingWithdrawals.slice(0, 5).map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="truncate">{teacherInfo(db, w.teacherId)?.name}</span>
                  <b>{formatBDT(w.amount)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing waiting.</p>
          )}
        </Section>
      </div>

      <Section
        title="Recent activity"
        action={<Link href="/admin/activity-logs" className="text-xs font-bold text-primary hover:underline">Full log</Link>}
      >
        <ul className="divide-y divide-border">
          {db.activityLogs.slice(0, 8).map((log) => (
            <li key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 text-sm">
              <ClipboardCheck size={15} className="hidden sm:block text-muted-foreground shrink-0" />
              <span className="flex-1">
                <b>{log.actorName}</b> <span className="text-muted-foreground">{log.action.toLowerCase()}</span> · {log.target}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(log.at)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
