"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, CheckCircle2, GraduationCap, Library, PlayCircle, Receipt, User } from "lucide-react";
import EnrolledCourseCard from "@/components/course/EnrolledCourseCard";
import { EmptyBlock, PageHeader, Section, StatCard, StatusBadge } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatBDT, formatDate } from "@/lib/format";
import {
  findLesson,
  getCourse,
  latestApplication,
  progressOf,
  studentCourses,
  teacherInfo,
} from "@/lib/selectors";
import { btn } from "@/lib/ui";

export default function StudentDashboard() {
  const { db, user } = useApp();
  const owned = studentCourses(db, user!.id);
  const totals = owned.reduce(
    (acc, { course, enrollment }) => {
      const p = progressOf(course, enrollment);
      return { completed: acc.completed + p.completed, total: acc.total + p.total };
    },
    { completed: 0, total: 0 },
  );
  const overall = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;
  const saved = db.savedLessons.filter((s) => s.studentId === user!.id);
  const purchases = db.purchases
    .filter((p) => p.studentId === user!.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recent = owned
    .filter((o) => o.enrollment.lastWatchedAt && o.enrollment.lastLessonId)
    .sort((a, b) => b.enrollment.lastWatchedAt!.localeCompare(a.enrollment.lastWatchedAt!));
  const continueList = (recent.length ? recent : owned)
    .filter((o) => progressOf(o.course, o.enrollment).percent < 100)
    .slice(0, 3);
  const application = latestApplication(db, user!.id);

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
        <StatCard label="Enrolled courses" value={owned.length} icon={Library} />
        <StatCard label="Lessons completed" value={`${totals.completed}/${totals.total}`} icon={CheckCircle2} />
        <StatCard label="Overall progress" value={`${overall}%`} icon={GraduationCap} hint="Across all your courses" />
        <StatCard label="Saved videos" value={saved.length} icon={Bookmark} />
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
            {continueList.map(({ course, enrollment }) => (
              <EnrolledCourseCard
                key={course.id}
                course={course}
                enrollment={enrollment}
                teacherName={teacherInfo(db, course.teacherId)?.name}
              />
            ))}
          </div>
        ) : (
          <EmptyBlock
            icon={Library}
            title={owned.length ? "You've finished all your courses!" : "No courses yet"}
            description={owned.length ? "Find your next course in the catalog." : "Buy a course to start learning."}
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
              {recent.slice(0, 5).map(({ course, enrollment }) => {
                const found = findLesson(course, enrollment.lastLessonId!);
                return (
                  found && (
                    <li key={course.id}>
                      <Link
                        href={`/learn/${course.id}?lesson=${found.lesson.id}`}
                        className="flex items-center gap-3 py-2.5 hover:text-primary"
                      >
                        <PlayCircle size={18} className="text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{found.lesson.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{course.title}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(enrollment.lastWatchedAt!)}
                        </span>
                      </Link>
                    </li>
                  )
                );
              })}
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
              {saved.slice(0, 5).map((s) => {
                const course = getCourse(db, s.courseId);
                const found = course && findLesson(course, s.lessonId);
                return (
                  found && (
                    <li key={s.id}>
                      <Link
                        href={`/learn/${s.courseId}?lesson=${s.lessonId}`}
                        className="flex items-center gap-3 py-2.5 hover:text-primary"
                      >
                        <Bookmark size={16} className="text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{found.lesson.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{course!.title}</p>
                        </div>
                      </Link>
                    </li>
                  )
                );
              })}
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
              {purchases.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <Receipt size={16} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{getCourse(db, p.courseId)?.title}</span>
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
