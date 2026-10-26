"use client";

import Link from "next/link";
import { BookOpen, ClipboardCheck, Coins, GraduationCap, Receipt, Users, Wallet } from "lucide-react";
import ReportsAlert from "@/components/dashboard/ReportsAlert";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import SalesChart from "@/components/ui/SalesChart";
import { PageHeader, Section, StatCard, StatusBadge } from "@/components/ui/primitives";
import type { AdminOverview } from "@/lib/api-types";
import { formatBDT, formatDate, formatDateTime } from "@/lib/format";
import { useApi } from "@/lib/use-api";

export default function AdminDashboard() {
  const overview = useApi<AdminOverview>("/admin/overview");

  return (
    <div className="space-y-6">
      <PageHeader title="Admin overview" description="Platform activity at a glance." />
      {!ready(overview) ? <ApiStatus state={overview} /> : <Overview data={overview.data} />}
    </div>
  );
}

function Overview({ data }: { data: AdminOverview }) {
  const { counts, totals } = data;
  return (
    <>
      <ReportsAlert
        count={data.reports.awaitingApproval}
        href="/admin/video-reports"
        text="video fix(es) waiting for your approval"
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Students" value={counts.students} icon={Users} />
        <StatCard label="Teachers" value={counts.teachers} icon={GraduationCap} />
        <StatCard label="Live courses" value={counts.liveCourses} icon={BookOpen} hint={`${counts.pendingCourses} awaiting approval`} />
        <StatCard label="Course sales" value={counts.sales} icon={Receipt} hint={`${counts.refunded} refunded`} />
        <StatCard label="Gross sales" value={formatBDT(totals.gross)} icon={Coins} hint="Paid by students" />
        <StatCard label="Platform commission" value={formatBDT(totals.commission)} hint="10% of gross sales" />
        <StatCard label="Teacher earnings" value={formatBDT(totals.teacherNet)} hint="Gross minus commission" />
        <StatCard
          label="Registration fees"
          value={formatBDT(data.registrationFees.total)}
          icon={Wallet}
          hint={`${data.registrationFees.count} payments`}
        />
      </div>

      <Section title="Sales and commission (last 6 months)">
        <SalesChart
          data={data.monthly}
          series={[
            { key: "gross", label: "Gross sales", color: "#00c853" },
            { key: "commission", label: "Commission", color: "#f59e0b" },
          ]}
        />
      </Section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Section
          title={`Applications to review (${counts.pendingApplications})`}
          action={<Link href="/admin/teacher-applications" className="text-xs font-bold text-primary hover:underline">Review</Link>}
        >
          {data.pendingApplications.length ? (
            <ul className="divide-y divide-border">
              {data.pendingApplications.map((a) => (
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
          title={`Courses to approve (${counts.pendingCourses})`}
          action={<Link href="/admin/courses?status=pending" className="text-xs font-bold text-primary hover:underline">Review</Link>}
        >
          {data.pendingCourses.length ? (
            <ul className="divide-y divide-border">
              {data.pendingCourses.map((c) => (
                <li key={c.id} className="py-2 text-sm">
                  <p className="truncate font-semibold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.teacher.name} · {formatDate(c.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing waiting.</p>
          )}
        </Section>

        <Section
          title={`Withdrawals to process (${counts.pendingWithdrawals})`}
          action={<Link href="/admin/withdrawals" className="text-xs font-bold text-primary hover:underline">Process</Link>}
        >
          {data.pendingWithdrawals.length ? (
            <ul className="divide-y divide-border">
              {data.pendingWithdrawals.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="truncate">{w.teacher.name}</span>
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
          {data.recentActivity.map((log) => (
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
    </>
  );
}
