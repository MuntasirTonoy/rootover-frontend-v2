"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Library, Users } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { Avatar, EmptyBlock, FilterSelect, PageHeader, SearchInput } from "@/components/ui/primitives";
import type { EnrolledCourse } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { LEVELS } from "@/lib/types";
import { btn } from "@/lib/ui";

const statusOptions = [
  { value: "", label: "All progress" },
  { value: "not-started", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export default function MyClassesPage() {
  const list = useApi<EnrolledCourse[]>("/me/enrollments");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  // "" = every teacher
  const [teacherId, setTeacherId] = useState("");

  if (!ready(list)) return <ApiStatus state={list} />;
  const owned = list.data;

  // Every teacher the student has courses from, for the row of photos
  const teachers = [...new Map(owned.map((x) => [x.course.teacher.id, x.course.teacher])).values()];
  const countOf = (id: string) => owned.filter((x) => x.course.teacher.id === id).length;
  const selected = teachers.find((t) => t.id === teacherId);

  // The list is small, so filters run here on what the API computed;
  // most recently watched first
  const q = query.trim().toLowerCase();
  const filtered = owned
    .filter(({ course, progress }) => {
      const { percent, completed } = progress;
      const progressState = percent === 100 ? "completed" : completed ? "in-progress" : "not-started";
      return (
        (!teacherId || course.teacher.id === teacherId) &&
        (!q || [course.title, course.subject, course.teacher.name].some((s) => s.toLowerCase().includes(q))) &&
        (!level || course.level === level) &&
        (!status || status === progressState)
      );
    })
    .sort((a, b) => (b.enrollment.lastWatchedAt ?? "").localeCompare(a.enrollment.lastWatchedAt ?? ""));

  return (
    <div>
      <PageHeader
        title="My Classes"
        description={`${owned.length} purchased course${owned.length === 1 ? "" : "s"}. Pick a teacher to see only their courses.`}
      />

      {owned.length === 0 ? (
        <EmptyBlock
          icon={Library}
          title="You haven't enrolled in any courses yet"
          description="Browse the catalog and buy a complete course to start learning."
          action={
            <Link href="/courses" className={btn.primary}>
              Browse courses
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search your courses or teachers" className="flex-1" />
            <FilterSelect
              label="Level"
              value={level}
              onChange={setLevel}
              options={[{ value: "", label: "All levels" }, ...LEVELS.map((l) => ({ value: l, label: l }))]}
            />
            <FilterSelect label="Progress" value={status} onChange={setStatus} options={statusOptions} />
          </div>

          {/* Teachers side by side: the round photo filters the courses, the name opens the
              teacher's profile. The padding keeps the selection ring from being clipped by the scroller. */}
          <div className="-mx-1 mb-6 flex items-start gap-3 sm:gap-5 overflow-x-auto px-1 pt-1 pb-3" aria-label="Teachers">
            <TeacherChip
              label="All"
              count={owned.length}
              active={!teacherId}
              onSelect={() => setTeacherId("")}
              photo={
                <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users size={24} />
                </span>
              }
            />
            {teachers.map((t) => (
              <TeacherChip
                key={t.id}
                label={t.name}
                href={`/teachers/${t.id}`}
                count={countOf(t.id)}
                active={teacherId === t.id}
                onSelect={() => setTeacherId(teacherId === t.id ? "" : t.id)}
                photo={<Avatar name={t.name} src={t.avatar} size="w-full h-full text-lg" />}
              />
            ))}
          </div>

          {selected && <h2 className="mb-4 font-bold text-foreground truncate">Courses by {selected.name}</h2>}

          {filtered.length === 0 ? (
            <EmptyBlock title="No courses match your filters" description="Try a different search or filter." />
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
              {filtered.map((item) => (
                <CourseCard
                  key={item.course.id}
                  course={item.course}
                  progress={item.progress}
                  learn={{
                    href: `/learn/${item.course.id}${item.resumeLessonId ? `?lesson=${item.resumeLessonId}` : ""}`,
                    label: item.progress.completed > 0 ? "Continue learning" : "Start learning",
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// One teacher in the row: round photo (filters the courses), the name under it
// (a link to the teacher's profile when `href` is given), and the course count
function TeacherChip({
  label,
  href,
  count,
  active,
  onSelect,
  photo,
}: {
  label: string;
  href?: string;
  count: number;
  active: boolean;
  onSelect: () => void;
  photo: ReactNode;
}) {
  const nameClass = `block w-full truncate text-xs font-semibold leading-4 ${active ? "text-primary" : "text-foreground"}`;
  return (
    <div className="flex w-20 shrink-0 flex-col items-center text-center">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        aria-label={href ? `Show courses by ${label}` : "Show all courses"}
        className={`h-16 w-16 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-primary ${
          active ? "ring-primary" : "ring-transparent hover:ring-border"
        }`}
      >
        {photo}
      </button>
      <div className="mt-2 w-full">
        {href ? (
          <Link href={href} title={`${label}'s profile`} className={`${nameClass} hover:text-primary hover:underline`}>
            {label}
          </Link>
        ) : (
          <span className={nameClass}>{label}</span>
        )}
        <span className="mt-0.5 block text-[10px] leading-3 text-muted-foreground">
          {count} {count === 1 ? "course" : "courses"}
        </span>
      </div>
    </div>
  );
}
