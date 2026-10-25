"use client";

import Link from "next/link";
import { Play, Sparkles } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import EmptyState from "@/components/EmptyState";
import { useApp } from "@/context/AppStore";
import { formatDuration } from "@/lib/format";
import { catalogCourses, flattenLessons, teacherInfo } from "@/lib/selectors";

export default function FreeTrialPage() {
  const { db } = useApp();
  const previews = catalogCourses(db).flatMap((course) =>
    flattenLessons(course)
      .filter((f) => f.lesson.isPreview)
      .map((f) => ({ course, ...f })),
  );

  return (
    <div className="container-custom py-12 md:py-16">
      <header className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-6">
          <Sparkles size={16} />
          <span>Free previews</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Try a lesson for free</h1>
        <p className="text-muted-foreground text-lg">
          Every course has free preview lessons. Watch one before you buy.
        </p>
      </header>

      {previews.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {previews.map(({ course, lesson, chapterTitle }) => (
            <Link
              key={lesson.id}
              href={`/learn/${course.id}?lesson=${lesson.id}`}
              className="group overflow-hidden rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="relative">
                <CourseThumb course={course} />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <span className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-90 group-hover:scale-110 transition-transform">
                    <Play size={22} fill="currentColor" />
                  </span>
                </div>
                <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                  FREE
                </span>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{chapterTitle}</p>
                <h3 className="font-bold text-foreground group-hover:text-primary line-clamp-2">{lesson.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground truncate">{course.title}</p>
                <p className="text-xs text-muted-foreground">
                  {teacherInfo(db, course.teacherId)?.name} · {formatDuration(lesson.durationMin)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No free previews yet" description="Check back soon for free lessons." />
      )}
    </div>
  );
}
