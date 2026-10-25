"use client";

import { useState } from "react";
import Link from "next/link";
import { Library } from "lucide-react";
import EnrolledCourseCard from "@/components/course/EnrolledCourseCard";
import { Avatar, EmptyBlock, FilterSelect, PageHeader, SearchInput } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { progressOf, studentCourses, teacherInfo } from "@/lib/selectors";
import { LEVELS } from "@/lib/types";
import { btn } from "@/lib/ui";

const statusOptions = [
  { value: "", label: "All progress" },
  { value: "not-started", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export default function MyClassesPage() {
  const { db, user } = useApp();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");

  const owned = studentCourses(db, user!.id);

  const q = query.trim().toLowerCase();
  const filtered = owned.filter(({ course, enrollment }) => {
    const { percent, completed } = progressOf(course, enrollment);
    const teacherName = teacherInfo(db, course.teacherId)?.name ?? "";
    const progressState = percent === 100 ? "completed" : completed ? "in-progress" : "not-started";
    return (
      (!q || [course.title, course.subject, teacherName].some((s) => s.toLowerCase().includes(q))) &&
      (!level || course.level === level) &&
      (!status || status === progressState)
    );
  });

  // One section per teacher, most recently watched first
  const groups = [...new Set(filtered.map((x) => x.course.teacherId))].map((teacherId) => ({
    teacher: teacherInfo(db, teacherId),
    items: filtered
      .filter((x) => x.course.teacherId === teacherId)
      .sort((a, b) => (b.enrollment.lastWatchedAt ?? "").localeCompare(a.enrollment.lastWatchedAt ?? "")),
  }));

  return (
    <div>
      <PageHeader
        title="My Classes"
        description={`${owned.length} purchased course${owned.length === 1 ? "" : "s"}, grouped by teacher.`}
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

          {groups.length === 0 ? (
            <EmptyBlock title="No courses match your filters" description="Try a different search or filter." />
          ) : (
            <div className="space-y-10">
              {groups.map(({ teacher, items }) => (
                <section key={teacher?.id ?? "unknown"}>
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={teacher?.name ?? "?"} src={teacher?.avatar} size="w-11 h-11" />
                      <div className="min-w-0">
                        <h2 className="font-bold text-foreground truncate">{teacher?.name ?? "Unknown teacher"}</h2>
                        <p className="text-xs text-muted-foreground truncate">{teacher?.headline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {items.length} course{items.length === 1 ? "" : "s"}
                      </span>
                      {teacher && (
                        <Link href={`/teachers/${teacher.id}`} className={btn.small}>
                          View profile
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
                    {items.map(({ course, enrollment }) => (
                      <EnrolledCourseCard key={course.id} course={course} enrollment={enrollment} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
