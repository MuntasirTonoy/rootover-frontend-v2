"use client";

import { useState } from "react";
import Link from "next/link";
import { Library } from "lucide-react";
import EnrolledCourseCard from "@/components/course/EnrolledCourseCard";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock, PageHeader, SearchInput } from "@/components/ui/primitives";
import type { EnrolledCourse } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { btn } from "@/lib/ui";

// Courses this teacher bought (usually as a student, before becoming a
// teacher). They keep full access and their progress.
export default function PurchasedCoursesPage() {
  const list = useApi<EnrolledCourse[]>("/me/enrollments");
  const [query, setQuery] = useState("");

  if (!ready(list)) return <ApiStatus state={list} />;
  const owned = list.data;
  const q = query.trim().toLowerCase();
  // Most recently watched first; the list is small, so search runs here
  const shown = owned
    .filter(({ course }) => !q || [course.title, course.subject, course.teacher.name].some((s) => s.toLowerCase().includes(q)))
    .sort((a, b) => (b.enrollment.lastWatchedAt ?? "").localeCompare(a.enrollment.lastWatchedAt ?? ""));

  return (
    <div>
      <PageHeader
        title="Purchased courses"
        description={`${owned.length} course${owned.length === 1 ? "" : "s"} you bought. You keep full access to every lesson.`}
      />
      {owned.length === 0 ? (
        <EmptyBlock
          icon={Library}
          title="You haven't purchased any courses"
          description="Courses you bought before becoming a teacher show up here."
          action={
            <Link href="/courses" className={btn.secondary}>
              Browse courses
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6">
            <SearchInput value={query} onChange={setQuery} placeholder="Search your purchased courses" />
          </div>
          {shown.length === 0 ? (
            <EmptyBlock title="No courses match" description="Try a different search." />
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
              {shown.map((item) => (
                <EnrolledCourseCard key={item.course.id} item={item} showTeacher canRate={false} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
