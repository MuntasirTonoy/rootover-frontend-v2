import { levelMeta } from "@/lib/levels";
import type { Course } from "@/lib/types";

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
  const { bg, icon: Icon } = levelMeta[course.level];
  return (
    <div
      role="img"
      aria-label={course.title}
      className={`relative ${aspect} w-full overflow-hidden ${bg} text-white ${className}`}
    >
      <Icon className="absolute -right-3 -bottom-3 w-16 h-16 sm:-right-4 sm:-bottom-4 sm:w-28 sm:h-28 opacity-15" strokeWidth={1.5} />
      <div className="absolute inset-0 p-2.5 sm:p-4 flex flex-col justify-end">
        <span className="text-sm sm:text-xl font-extrabold leading-tight line-clamp-2">
          {course.title|| "New course"}
        </span>
      </div>
    </div>
  );
}
