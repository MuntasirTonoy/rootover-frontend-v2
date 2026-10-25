"use client";

import Link from "next/link";
import { BadgeCheck, BookOpen, Coins, Hourglass, Plus, Receipt, Users, Wallet } from "lucide-react";
import ReportsAlert from "@/components/dashboard/ReportsAlert";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import DataTable from "@/components/ui/DataTable";
import SalesChart from "@/components/ui/SalesChart";
import { Avatar, PageHeader, Section, StatCard, Stars, StatusBadge, courseStatusLabel } from "@/components/ui/primitives";
import { formatBDT, formatDate } from "@/lib/format";
import { CLEARING_DAYS } from "@/lib/pricing";
import type { TeacherDashboard as Dashboard } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { btn } from "@/lib/ui";
import { useTeacher } from "@/lib/use-teacher";

export default function TeacherDashboard() {
  const { teacher, application } = useTeacher();
  const dashboard = useApi<Dashboard>("/teacher/dashboard");
  if (!ready(dashboard)) return <ApiStatus state={dashboard} />;
  // Every figure is computed by the API (money, counts, the 6-month chart)
  const { counts, students, finance, monthly, coursePerformance, recentEnrollments: recent, reports } = dashboard.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher dashboard"
        description={`Teacher ID ${teacher.teacherCode} · all sales below are simulated demo data.`}
        actions={
          <Link href="/teacher/courses/new" className={btn.primary}>
            <Plus size={16} /> New course
          </Link>
        }
      />

      <ReportsAlert
        count={reports.needsFix}
        href="/teacher/reports"
        text="reported video(s) need your fix"
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total courses"
          value={counts.total}
          icon={BookOpen}
          hint={`${counts.approved} live · ${counts.pending} pending · ${counts.draft} draft`}
        />
        <StatCard label="Students" value={students} icon={Users} hint={`${finance.sales} completed sales`} />
        <StatCard label="Gross sales" value={formatBDT(finance.gross)} icon={Receipt} hint="What students paid" />
        <StatCard label="Net earnings" value={formatBDT(finance.teacherNet)} icon={Coins} hint={`After ${formatBDT(finance.commission)} commission`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Revenue (last 6 months)" className="lg:col-span-2">
          <SalesChart
            data={monthly}
            series={[
              { key: "gross", label: "Gross sales", color: "#00c853" },
              { key: "net", label: "Your earnings", color: "#2563eb" },
            ]}
          />
        </Section>

        <Section title="Earnings breakdown">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Gross sales</dt>
              <dd>{formatBDT(finance.gross)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Platform commission (10%)</dt>
              <dd>-{formatBDT(finance.commission)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2.5 font-bold">
              <dt>Net earnings</dt>
              <dd>{formatBDT(finance.teacherNet)}</dd>
            </div>
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-surface p-2.5">
              <p className="flex items-center gap-1 text-muted-foreground">
                <Hourglass size={12} /> Pending clearance
              </p>
              <p className="mt-0.5 font-bold text-sm">{formatBDT(finance.pendingClearance)}</p>
            </div>
            <div className="rounded-md bg-surface p-2.5">
              <p className="text-muted-foreground">Withdrawn</p>
              <p className="mt-0.5 font-bold text-sm">{formatBDT(finance.withdrawn)}</p>
            </div>
            <div className="rounded-md bg-surface p-2.5">
              <p className="text-muted-foreground">Pending withdrawals</p>
              <p className="mt-0.5 font-bold text-sm">{formatBDT(finance.pendingWithdrawals)}</p>
            </div>
            <div className="rounded-md bg-primary/10 p-2.5">
              <p className="flex items-center gap-1 text-primary">
                <Wallet size={12} /> Withdrawable
              </p>
              <p className="mt-0.5 font-bold text-sm">{formatBDT(finance.withdrawable)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Sales clear after {CLEARING_DAYS} days.</p>
          <Link href="/teacher/withdrawals" className={`${btn.primary} mt-3 w-full`}>
            Request withdrawal
          </Link>
        </Section>
      </div>

      <Section title="Course performance">
        <DataTable<Dashboard["coursePerformance"][number]>
          rows={coursePerformance}
          rowKey={(c) => c.course.id}
          pageSize={5}
          emptyTitle="No submitted courses yet"
          columns={[
            {
              header: "Course",
              cell: (c) => (
                <Link href={`/teacher/courses/${c.course.id}/edit`} className="font-semibold hover:text-primary">
                  {c.course.title}
                </Link>
              ),
            },
            { header: "Status", cell: (c) => <StatusBadge status={c.status} label={courseStatusLabel(c.status)} /> },
            { header: "Students", cell: (c) => c.students },
            { header: "Gross", cell: (c) => formatBDT(c.gross) },
            { header: "Net", cell: (c) => formatBDT(c.net) },
            { header: "Rating", cell: (c) => <Stars rating={c.rating.average} count={c.rating.count} /> },
          ]}
        />
      </Section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Section
          title="Recent enrollments"
          className="lg:col-span-2"
          action={
            <Link href="/teacher/students" className="text-xs font-bold text-primary hover:underline">
              All students
            </Link>
          }
        >
          {recent.length ? (
            <ul className="divide-y divide-border">
              {recent.map((p) => (
                <li key={p.purchaseId} className="flex items-center gap-3 py-2.5 text-sm">
                  <Avatar name={p.student.name} src={p.student.avatar} size="w-8 h-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.student.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.course.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(p.createdAt)}</span>
                  <b className="shrink-0">{formatBDT(p.teacherNet)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No enrollments yet.</p>
          )}
        </Section>

        <Section title="Verification status">
          <div className="flex items-start gap-3 text-sm">
            <BadgeCheck className="text-primary shrink-0" />
            <div>
              <p className="font-bold">Verified teacher</p>
              <p className="text-muted-foreground">
                Teacher ID <span className="font-mono">{teacher.teacherCode}</span>
              </p>
              {application && (
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={application.status} />
                  <span className="text-xs text-muted-foreground">since {formatDate(application.updatedAt)}</span>
                </div>
              )}
              <Link href="/teacher/profile" className={`${btn.small} mt-3`}>
                Edit teacher profile
              </Link>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
