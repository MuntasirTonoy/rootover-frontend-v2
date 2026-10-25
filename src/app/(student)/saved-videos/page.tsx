"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bookmark, BookmarkX, Clock, Play } from "lucide-react";
import CourseThumb from "@/components/course/CourseThumb";
import { EmptyBlock, FilterSelect, PageHeader, SearchInput } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatDate, formatDuration } from "@/lib/format";
import { findLesson, getCourse, teacherInfo } from "@/lib/selectors";
import { btn } from "@/lib/ui";

export default function SavedVideosPage() {
  const { db, user, toggleSaved } = useApp();
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("");

  const saved = db.savedLessons
    .filter((s) => s.studentId === user!.id)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .flatMap((s) => {
      const course = getCourse(db, s.courseId);
      const found = course && findLesson(course, s.lessonId);
      return course && found
        ? [{ saved: s, course, ...found, teacher: teacherInfo(db, course.teacherId) }]
        : [];
    });

  const courseOptions = [...new Map(saved.map((s) => [s.course.id, s.course.title])).entries()];
  const q = query.trim().toLowerCase();
  const visible = saved.filter(
    (s) =>
      (!courseFilter || s.course.id === courseFilter) &&
      (!q ||
        [s.lesson.title, s.chapterTitle, s.course.title, s.teacher?.name ?? ""].some((t) =>
          t.toLowerCase().includes(q),
        )),
  );

  const remove = (courseId: string, lessonId: string) => {
    toggleSaved(courseId, lessonId);
    toast.success("Removed from saved videos");
  };

  return (
    <div>
      <PageHeader title="Saved Videos" description="Lessons you bookmarked to revisit later." />

      {saved.length === 0 ? (
        <EmptyBlock
          icon={Bookmark}
          title="No saved lessons yet"
          description="Use the Save button in the course player to bookmark lessons you want to revise."
          action={
            <Link href="/my-classes" className={btn.primary}>
              Go to My Classes
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search saved lessons" className="flex-1" />
            <FilterSelect
              label="Course"
              value={courseFilter}
              onChange={setCourseFilter}
              options={[
                { value: "", label: "All courses" },
                ...courseOptions.map(([value, label]) => ({ value, label })),
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyBlock title="No saved lessons match" description="Try a different search or course." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {visible.map(({ saved: s, course, lesson, chapterTitle, chapterIndex, teacher }) => {
                const href = `/learn/${course.id}?lesson=${lesson.id}`;
                return (
                  <article key={s.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
                    <Link href={href} className="group relative block" aria-label={`Watch ${lesson.title}`}>
                      <CourseThumb course={course} />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                        <span className="w-12 h-12 rounded-full bg-white/90 text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play size={20} fill="currentColor" />
                        </span>
                      </div>
                      <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        {formatDuration(lesson.durationMin)}
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-xs font-semibold text-primary truncate">
                        Chapter {chapterIndex + 1}: {chapterTitle}
                      </p>
                      <h3 className="mt-0.5 font-bold text-foreground line-clamp-2">{lesson.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground truncate">{course.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{teacher?.name}</p>
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock size={12} /> Saved {formatDate(s.savedAt)}
                      </p>
                      <div className="mt-auto pt-4 flex gap-2">
                        <Link href={href} className={`${btn.primary} flex-1`}>
                          <Play size={15} /> Watch video
                        </Link>
                        <button
                          onClick={() => remove(course.id, lesson.id)}
                          className={btn.secondary}
                          aria-label={`Remove ${lesson.title} from saved`}
                          title="Remove from saved"
                        >
                          <BookmarkX size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
