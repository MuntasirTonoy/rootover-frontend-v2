"use client";

import { useState } from "react";
import Link from "next/link";
import { Library } from "lucide-react";
import EnrolledCourseCard from "@/components/course/EnrolledCourseCard";
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

  if (!ready(list)) return <ApiStatus state={list} />;
  const owned = list.data;

  // The list is small, so filters run here on what the API computed
  const q = query.trim().toLowerCase();
  const filtered = owned.filter(({ course, progress }) => {
    const { percent, completed } = progress;
    const teacherName = course.teacher.name;
    const progressState = percent === 100 ? "completed" : completed ? "in-progress" : "not-started";
    return (
      (!q || [course.title, course.subject, teacherName].some((s) => s.toLowerCase().includes(q))) &&
      (!level || course.level === level) &&
      (!status || status === progressState)
    );
  });

  // One section per teacher, most recently watched first
  const groups = [...new Map(filtered.map((x) => [x.course.teacher.id, x.course.teacher])).values()].map((teacher) => ({
    teacher,
    items: filtered
      .filter((x) => x.course.teacher.id === teacher.id)
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
                <section key={teacher.id}>
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={teacher.name} src={teacher.avatar} size="w-11 h-11" />
                      <div className="min-w-0">
                        <h2 className="font-bold text-foreground truncate">{teacher.name}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {items.length} course{items.length === 1 ? "" : "s"}
                      </span>
                      <Link href={`/teachers/${teacher.id}`} className={btn.small}>
                        View profile
                      </Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
                    {items.map((item) => (
                      <EnrolledCourseCard key={item.course.id} item={item} />
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
