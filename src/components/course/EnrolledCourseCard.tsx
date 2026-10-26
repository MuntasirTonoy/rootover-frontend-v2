import Link from "next/link";
import { CheckCircle2, Clock, PlayCircle, Star } from "lucide-react";
import CourseThumb from "./CourseThumb";
import { Badge } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import type { EnrolledCourse } from "@/lib/api-types";

// A purchased course with progress and a "Continue learning" action. Phones show
// these two per row, so progress moves onto the thumbnail and the body is compact.
export default function EnrolledCourseCard({ item, showTeacher }: { item: EnrolledCourse; showTeacher?: boolean }) {
  const { course, enrollment, progress, resumeLessonId: resume, lastLesson: last } = item;
  const teacherName = showTeacher ? course.teacher.name : undefined;
  const done = progress.percent === 100;
  const started = progress.completed > 0;
  const [shortLabel, label] = done
    ? ["Review", "Review course"]
    : started
      ? ["Continue", "Continue learning"]
      : ["Start", "Start learning"];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl sm:rounded-lg border border-border bg-card">
      <Link href={`/courses/${course.id}`} className="relative block">
        <CourseThumb course={course} tallOnMobile />
        <span
          className={`absolute left-1.5 bottom-1.5 sm:left-2 sm:bottom-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white ${
            done ? "bg-green-600" : "bg-black/60 backdrop-blur-sm"
          }`}
        >
          {done && <CheckCircle2 size={11} />}
          {done ? "Completed" : started ? `${progress.percent}% done` : "New"}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Badge tone="primary">{course.level}</Badge>
          {teacherName && <span className="hidden sm:inline truncate text-xs text-muted-foreground">{teacherName}</span>}
        </div>
        <h3 className="text-[13px] sm:text-base font-bold leading-snug text-foreground line-clamp-2">{course.title}</h3>
        <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground">
          {progress.completed}/{progress.total} lessons
          <span className="hidden sm:inline"> · {progress.percent}% complete</span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
          {course.rating.count ? (
            <>
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <b className="text-amber-500">{course.rating.average.toFixed(1)}</b>
              <span>({course.rating.count})</span>
            </>
          ) : (
            "No ratings yet"
          )}
          <Link href={`/courses/${course.id}#reviews`} className="ml-auto font-semibold text-primary hover:underline">
            Rate
          </Link>
        </p>

        <p className="hidden sm:flex mt-3 text-xs text-muted-foreground items-start gap-1.5">
          <Clock size={13} className="shrink-0 mt-0.5" />
          {last && enrollment.lastWatchedAt ? (
            <span>
              Last watched <b className="text-foreground">{last.title}</b> on {formatDate(enrollment.lastWatchedAt)}
            </span>
          ) : (
            <span>Not started yet</span>
          )}
        </p>

        <div className="mt-auto pt-2.5 sm:pt-4">
          <Link
            href={`/learn/${course.id}${resume ? `?lesson=${resume}` : ""}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <PlayCircle size={15} />
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
