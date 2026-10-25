import { Atom, BookOpen, Briefcase, Code2, FlaskConical, GraduationCap, type LucideIcon } from "lucide-react";
import type { Course, Level } from "@/lib/types";

const levelStyle: Record<Level, { bg: string; icon: LucideIcon }> = {
  SSC: { bg: "bg-emerald-600", icon: Atom },
  HSC: { bg: "bg-sky-600", icon: FlaskConical },
  BSc: { bg: "bg-indigo-600", icon: GraduationCap },
  BBA: { bg: "bg-amber-600", icon: Briefcase },
  BA: { bg: "bg-rose-600", icon: BookOpen },
  Others: { bg: "bg-zinc-700", icon: Code2 },
};

// Uses the uploaded thumbnail, or a generated tile coloured by level
export default function CourseThumb({
  course,
  className = "",
  tallOnMobile = false,
}: {
  course: Pick<Course, "thumbnail" | "level" | "subject" | "title">;
  className?: string;
  // 4:3 on phones (for two-per-row card grids), 16:9 from sm up
  tallOnMobile?: boolean;
}) {
  const aspect = tallOnMobile ? "aspect-[4/3] sm:aspect-video" : "aspect-video";
  if (course.thumbnail) {
    return (
      <img
        src={course.thumbnail}
        alt={course.title}
        className={`${aspect} w-full object-cover bg-surface ${className}`}
      />
    );
  }
  const { bg, icon: Icon } = levelStyle[course.level];
  return (
    <div
      role="img"
      aria-label={course.title}
      className={`relative ${aspect} w-full overflow-hidden ${bg} text-white ${className}`}
    >
      <Icon className="absolute -right-3 -bottom-3 w-16 h-16 sm:-right-4 sm:-bottom-4 sm:w-28 sm:h-28 opacity-15" strokeWidth={1.5} />
      <div className="absolute inset-0 p-2.5 sm:p-4 flex flex-col justify-between">
        <span className="self-start rounded bg-white/20 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wide">
          {course.level}
        </span>
        <span className="text-sm sm:text-xl font-extrabold leading-tight line-clamp-2">
          {course.subject || "New course"}
        </span>
      </div>
    </div>
  );
}
