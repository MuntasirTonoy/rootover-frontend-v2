"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, PlayCircle, Star, Users } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import { Badge, Stars } from "@/components/ui/primitives";
import { formatBDT } from "@/lib/format";
import type { CourseSummary } from "@/lib/api-types";

// Phones show these two per row, so below `sm` the card switches to a compact
// layout: taller thumbnail, short rating, no stats row, price pinned to the bottom.
// purchased: the signed-in user owns this course (lib/use-owned-courses.ts)
// learn: replaces the price with a button into the player (owned courses:
// the catalog's purchased cards and My Classes)
export default function CourseCard({
  course,
  purchased = false,
  learn,
}: {
  course: CourseSummary;
  purchased?: boolean;
  learn?: { href: string; label: string };
}) {
  const { rating, effectivePrice: price, discountPercent: off } = course;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl sm:rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
      {/* The card opens the course details; the learn button below is a separate link */}
      <Link href={`/courses/${course.id}`} className="flex flex-1 flex-col">
        <div className="relative">
          <CourseThumb course={course} tallOnMobile />
          {purchased && (
            <span className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2 inline-flex items-center gap-1 rounded bg-green-600 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white shadow-sm">
              <CheckCircle2 size={12} /> Purchased
            </span>
          )}
          {off > 0 && !learn && (
            <span className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 rounded bg-red-600 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white">
              {off}% OFF
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-2.5 sm:p-4">
          <div className="mb-1.5 sm:mb-2 flex items-center gap-2">
            <Badge tone="primary">{course.level}</Badge>
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">{course.subject}</span>
          </div>
          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-muted-foreground truncate">
            {course.teacher.name}
          </p>

          {/* Compact rating on phones (only once rated), full stars from sm up */}
          {rating.count > 0 && (
            <p className="sm:hidden mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <b className="text-amber-500">{rating.average.toFixed(1)}</b>({rating.count})
            </p>
          )}
          <div className="hidden sm:block mt-2">
            <Stars rating={rating.average} count={rating.count} />
          </div>
          <div className="hidden sm:flex mt-2 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen size={13} /> {course.lessonCount} lessons
            </span>
            <span className="flex items-center gap-1">
              <Users size={13} /> {course.studentCount} students
            </span>
          </div>

          {!learn && (
            <div className="mt-auto pt-2 sm:pt-3 flex flex-wrap items-baseline gap-x-1.5 sm:gap-x-2">
              <span className="text-sm sm:text-lg font-extrabold text-foreground">{formatBDT(price)}</span>
              {price < course.price && (
                <span className="text-[11px] sm:text-sm text-muted-foreground line-through">{formatBDT(course.price)}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      {learn && (
        <div className="px-2.5 pb-2.5 sm:px-4 sm:pb-4">
          <Link
            href={learn.href}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <PlayCircle size={15} /> {learn.label}
          </Link>
        </div>
      )}
    </div>
  );
}
