"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, PlayCircle, Star, Users } from "lucide-react";
import { CardCartButton } from "@/components/cart/CartButtons";
import CourseThumb from "@/components/course/CourseThumb";
import { Badge, Stars } from "@/components/ui/primitives";
import { formatBDT } from "@/lib/format";
import type { CourseSummary, Progress } from "@/lib/api-types";

// Phones show these two per row, so below `sm` the card switches to a compact
// layout: taller thumbnail, short rating, no stats row, price pinned to the bottom.
// purchased: the signed-in user owns this course (lib/use-owned-courses.ts):
//   a "Purchased" badge, and "You own this course" instead of the price
// progress: the buyer's progress, shown instead of the rating and stats (My Classes)
// learn: a button into the player below the card (My Classes)
// cartButton: a round add-to-cart button in the card's bottom-right corner (catalog)
export default function CourseCard({
  course,
  purchased = false,
  progress,
  learn,
  cartButton = false,
}: {
  course: CourseSummary;
  purchased?: boolean;
  progress?: Progress;
  learn?: { href: string; label: string };
  cartButton?: boolean;
}) {
  const { rating, effectivePrice: price, discountPercent: off } = course;
  const showCart = cartButton && !learn && !purchased;
  const showPrice = !learn;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl sm:rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
      {/* The card opens the course details; the learn and cart buttons are separate */}
      <Link href={`/courses/${course.id}`} className="flex flex-1 flex-col">
        <div className="relative">
          <CourseThumb course={course} tallOnMobile />
          {purchased && (
            <span className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2 inline-flex items-center gap-1 rounded bg-green-600 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white shadow-sm">
              <CheckCircle2 size={12} /> Purchased
            </span>
          )}
          {off > 0 && !learn && !purchased && (
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

          {progress ? (
            <div className="mt-2 sm:mt-3">
              <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-muted-foreground">
                <span>
                  {progress.completed}/{progress.total} lessons
                </span>
                <span className={`font-bold ${progress.percent === 100 ? "text-green-600" : "text-foreground"}`}>
                  {progress.percent === 100 ? "Completed" : `${progress.percent}%`}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${progress.percent}% complete`}
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/20"
              >
                <div
                  className={`h-full rounded-full ${progress.percent === 100 ? "bg-green-600" : "bg-primary"}`}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

          {showPrice &&
            (purchased ? (
              <p className="mt-auto pt-2 sm:pt-3 text-xs sm:text-sm font-bold text-green-600">You own this course</p>
            ) : (
              <div
                className={`mt-auto pt-2 sm:pt-3 flex flex-wrap items-baseline gap-x-1.5 sm:gap-x-2 ${showCart ? "pr-10 sm:pr-11" : ""}`}
              >
                <span className="text-sm sm:text-lg font-extrabold text-foreground">{formatBDT(price)}</span>
                {price < course.price && (
                  <span className="text-[11px] sm:text-sm text-muted-foreground line-through">{formatBDT(course.price)}</span>
                )}
              </div>
            ))}
        </div>
      </Link>

      {/* Outside the card's link, in the very bottom-right corner */}
      {showCart && (
        <div className="absolute right-2 bottom-2 sm:right-3 sm:bottom-3">
          <CardCartButton courseId={course.id} title={course.title} />
        </div>
      )}

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
