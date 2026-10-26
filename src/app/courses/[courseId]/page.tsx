"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Eye, Layers, Pencil, PlayCircle, Users } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import CurriculumList from "@/components/course/CurriculumList";
import TeacherCard from "@/components/course/TeacherCard";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Badge, courseStatusLabel, EmptyBlock, Stars, StatusBadge } from "@/components/ui/primitives";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { useApp } from "@/context/AppStore";
import type { CourseDetail } from "@/lib/api-types";
import { formatBDT, formatDate, formatDuration } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { btn } from "@/lib/ui";

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseDetailsPage({ params }: CoursePageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingAnimation />
        </div>
      }
    >
      <CourseDetails params={params} />
    </Suspense>
  );
}

function CourseDetails({ params }: CoursePageProps) {
  const { courseId } = use(params);
  const { user } = useApp();
  // The API decides visibility (unpublished courses are 404 except to their
  // owner and admins) and leaves out the links of lessons the viewer can't watch
  const detail = useApi<CourseDetail>(`/courses/${courseId}`);

  if (!ready(detail) && detail.error?.status !== 404) return <ApiStatus state={detail} className="min-h-[60vh]" />;
  const course = detail.data;

  if (!course) {
    return (
      <div className="container-custom py-16">
        <EmptyBlock
          icon={BookOpen}
          title="Course not available"
          description="This course doesn't exist or hasn't been published yet."
          action={
            <Link href="/courses" className={btn.primary}>
              Browse courses
            </Link>
          }
        />
      </div>
    );
  }

  const { teacher, rating, published, access, enrollment } = course;
  const previewLesson = course.chapters.flatMap((c) => c.lessons).find((l) => l.isPreview);

  return (
    <div className="pb-16">
      {!published && (
        <div className="border-b border-amber-500/30 bg-amber-500/10">
          <div className="container-custom py-2.5 flex flex-wrap items-center gap-2 text-sm">
            <Eye size={16} className="text-amber-600" />
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              Preview only. Students can&apos;t see this course yet.
            </span>
            <StatusBadge status={course.status} label={courseStatusLabel(course.status)} />
            {course.statusNote && <span className="text-muted-foreground">{course.statusNote}</span>}
          </div>
        </div>
      )}

      {/* Header */}
      <section className="bg-surface border-b border-border">
        <div className="container-custom py-10 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
              <Link href={`/courses?level=${course.level}`}>
                <Badge tone="primary">{course.level}</Badge>
              </Link>
              <span className="text-muted-foreground">{course.subject}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
              {course.title}
            </h1>
            <p className="text-muted-foreground text-lg mb-4">{course.description}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <Stars rating={rating.average} count={rating.count} />
              <span className="flex items-center gap-1.5">
                <Users size={15} /> {course.studentCount} students
              </span>
              <span className="flex items-center gap-1.5">
                <Layers size={15} /> {course.chapterCount} chapters
              </span>
              <span className="flex items-center gap-1.5">
                <PlayCircle size={15} /> {course.lessonCount} lessons
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={15} /> {formatDuration(course.durationMin)}
              </span>
            </div>
            <p className="mt-4 text-sm">
              Taught by{" "}
              <Link href={`/teachers/${teacher.id}`} className="font-bold text-primary hover:underline">
                {teacher.name}
              </Link>
            </p>
          </div>

          {/* Price card */}
          <aside className="lg:row-span-2">
            <div className="lg:sticky lg:top-24 rounded-lg border border-border bg-card overflow-hidden">
              <CourseThumb course={course} />
              <div className="p-5 space-y-4">
                {enrollment ? (
                  <>
                    <div>
                      <p className="text-sm font-bold text-foreground">You own this course</p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment.progress.completed}/{enrollment.progress.total} lessons completed ({enrollment.progress.percent}%)
                      </p>
                    </div>
                    <Link href={`/learn/${course.id}${enrollment.resumeLessonId ? `?lesson=${enrollment.resumeLessonId}` : ""}`} className={`${btn.primary} w-full py-3`}>
                      Continue learning
                    </Link>
                  </>
                ) : access.owner ? (
                  <Link href={`/teacher/courses/${course.id}/edit`} className={`${btn.primary} w-full py-3`}>
                    <Pencil size={16} /> Edit this course
                  </Link>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-foreground">{formatBDT(course.effectivePrice)}</span>
                      {course.discountPercent > 0 && (
                        <>
                          <span className="text-muted-foreground line-through">{formatBDT(course.price)}</span>
                          <Badge tone="red">{course.discountPercent}% OFF</Badge>
                        </>
                      )}
                    </div>
                    {user && user.role !== "student" ? (
                      <p className="rounded-md bg-surface px-3 py-2 text-center text-xs text-muted-foreground">
                        Only student accounts can buy courses.
                      </p>
                    ) : published ? (
                      <Link href={`/checkout?courseId=${course.id}`} className={`${btn.primary} w-full py-3`}>
                        Enroll now
                      </Link>
                    ) : (
                      <button disabled className={`${btn.primary} w-full py-3`}>
                        Not available yet
                      </button>
                    )}
                    {previewLesson && (
                      <Link href={`/learn/${course.id}?lesson=${previewLesson.id}`} className={`${btn.secondary} w-full`}>
                        <PlayCircle size={16} /> Watch free preview
                      </Link>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      One payment for the full course. Coupons can be applied at checkout.
                    </p>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="container-custom grid lg:grid-cols-3 gap-8 pt-8">
        <div className="lg:col-span-2 space-y-8">
          {course.outcomes.length > 0 && (
            <section className="rounded-lg border border-border p-5">
              <h2 className="text-lg font-bold mb-4">What you&apos;ll learn</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-2 text-sm text-foreground">
                    <CheckCircle2 size={18} className="text-primary shrink-0" /> {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-bold mb-1">Course curriculum</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {course.chapterCount} chapters · {course.lessonCount} lessons ·{" "}
              {formatDuration(course.durationMin)} total
            </p>
            <CurriculumList chapters={course.chapters} courseId={course.id} canWatch={(lesson) => lesson.canWatch} />
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">About the teacher</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <TeacherCard teacher={teacher} />
              <div className="rounded-lg border border-border p-5 text-sm">
                {teacher.bio && <p className="text-muted-foreground mb-3">{teacher.bio}</p>}
                {teacher.qualifications.length > 0 && (
                  <>
                    <p className="font-bold text-foreground mb-1">Qualifications</p>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                      {teacher.qualifications.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-3 text-muted-foreground">{teacher.experienceYears} years of teaching experience</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">Student reviews</h2>
            {course.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {course.reviews.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm">{r.studentName}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span>
                    </div>
                    <Stars rating={r.rating} />
                    <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
