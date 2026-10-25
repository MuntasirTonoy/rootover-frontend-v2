"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, CheckCircle2, GraduationCap, Library, PlayCircle, Receipt, User } from "lucide-react";
import EnrolledCourseCard from "@/components/course/EnrolledCourseCard";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock, PageHeader, Section, StatCard, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import type { StudentDashboard as Dashboard } from "@/lib/api-types";
import { formatBDT, formatDate } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { btn } from "@/lib/ui";

export default function StudentDashboard() {
  const { user } = useApp();
  const dashboard = useApi<Dashboard>("/me/dashboard");
  if (!ready(dashboard)) return <ApiStatus state={dashboard} />;

  // Lists come capped and sorted: continue ≤3, recently watched ≤5, saved ≤5, purchases ≤4
  const { stats, continueLearning: continueList, recentlyWatched: recent, saved, recentPurchases: purchases, application } =
    dashboard.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi, ${user!.name.split(" ")[0]} 👋`}
        description="Pick up where you left off."
        actions={
          <Link href="/courses" className={btn.secondary}>
            Browse courses
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Enrolled courses" value={stats.enrolled} icon={Library} />
        <StatCard label="Lessons completed" value={`${stats.lessonsCompleted}/${stats.lessonsTotal}`} icon={CheckCircle2} />
        <StatCard label="Overall progress" value={`${stats.overallPercent}%`} icon={GraduationCap} hint="Across all your courses" />
        <StatCard label="Saved videos" value={stats.saved} icon={Bookmark} />
      </div>

      <Section
        title="Continue learning"
        action={
          <Link href="/my-classes" className="text-xs font-bold text-primary hover:underline">
            All classes
          </Link>
        }
      >
        {continueList.length ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {continueList.map((item) => (
              <EnrolledCourseCard key={item.course.id} item={item} showTeacher />
            ))}
          </div>
        ) : (
          <EmptyBlock
            icon={Library}
            title={stats.enrolled ? "You've finished all your courses!" : "No courses yet"}
            description={stats.enrolled ? "Find your next course in the catalog." : "Buy a course to start learning."}
            action={
              <Link href="/courses" className={btn.primary}>
                Browse courses
              </Link>
            }
          />
        )}
      </Section>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Recently watched">
          {recent.length ? (
            <ul className="divide-y divide-border">
              {recent.map(
                ({ course, enrollment, lastLesson }) =>
                  lastLesson && (
                    <li key={course.id}>
                      <Link
                        href={`/learn/${course.id}?lesson=${lastLesson.id}`}
                        className="flex items-center gap-3 py-2.5 hover:text-primary"
                      >
                        <PlayCircle size={18} className="text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{lastLesson.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{course.title}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(enrollment.lastWatchedAt!)}
                        </span>
                      </Link>
                    </li>
                  ),
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Lessons you watch will show up here.</p>
          )}
        </Section>

        <Section
          title="Saved videos"
          action={
            <Link href="/saved-videos" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          }
        >
          {saved.length ? (
            <ul className="divide-y divide-border">
              {saved.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/learn/${s.course.id}?lesson=${s.lesson.id}`}
                    className="flex items-center gap-3 py-2.5 hover:text-primary"
                  >
                    <Bookmark size={16} className="text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.lesson.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.course.title}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Save lessons from the course player to revise later.</p>
          )}
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Section
          title="Recent purchases"
          className="lg:col-span-2"
          action={
            <Link href="/purchase-history" className="text-xs font-bold text-primary hover:underline">
              Full history
            </Link>
          }
        >
          {purchases.length ? (
            <ul className="divide-y divide-border">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <Receipt size={16} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{p.course.title}</span>
                  </div>
                  <span className="shrink-0 text-muted-foreground">{formatDate(p.createdAt)}</span>
                  <b className="shrink-0">{formatBDT(p.amountPaid)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          )}
        </Section>

        <Section title="Account">
          <div className="space-y-3 text-sm">
            <Link href="/profile" className="flex items-center gap-2 font-semibold hover:text-primary">
              <User size={16} /> Profile settings <ArrowRight size={14} className="ml-auto" />
            </Link>
            {user!.role === "student" && (
              <div className="rounded-md border border-border p-3">
                <p className="font-semibold">Teach on Root Over</p>
                {application ? (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Application status</span>
                    <StatusBadge status={application.status} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Share your knowledge and earn from every sale.</p>
                )}
                <Link href="/teacher/apply" className={`${btn.small} mt-3 w-full`}>
                  {application ? "View application" : "Apply as a teacher"}
                </Link>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
