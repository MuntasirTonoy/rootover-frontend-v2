"use client";

import Link from "next/link";
import { BookOpen, Star, Users } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import { Badge, Stars } from "@/components/ui/primitives";
import { formatBDT } from "@/lib/format";
import type { CourseSummary } from "@/lib/api-types";

// Phones show these two per row, so below `sm` the card switches to a compact
// layout: taller thumbnail, short rating, no stats row, price pinned to the bottom.
export default function CourseCard({ course }: { course: CourseSummary }) {
  const { rating, effectivePrice: price, discountPercent: off } = course;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl sm:rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all"
    >
      <div className="relative">
        <CourseThumb course={course} tallOnMobile className="group-hover:opacity-95" />
        {off > 0 && (
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
        <h3 className="text-[13px] sm:text-base font-bold leading-snug text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
          {course.title}
        </h3>
        <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-muted-foreground truncate">
          {course.teacher.name}
        </p>

        {/* Compact rating on phones, full stars from sm up */}
        <p className="sm:hidden mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          {rating.count ? (
            <>
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <b className="text-amber-500">{rating.average.toFixed(1)}</b>({rating.count})
            </>
          ) : (
            "New"
          )}
        </p>
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

        <div className="mt-auto pt-2 sm:pt-3 flex flex-wrap items-baseline gap-x-1.5 sm:gap-x-2">
          <span className="text-sm sm:text-lg font-extrabold text-foreground">{formatBDT(price)}</span>
          {price < course.price && (
            <span className="text-[11px] sm:text-sm text-muted-foreground line-through">{formatBDT(course.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
