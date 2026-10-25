"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ListVideo,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import CurriculumSidebar from "@/components/course/CurriculumSidebar";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Avatar, EmptyBlock } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatBDT, formatDuration } from "@/lib/format";
import { coursePrice } from "@/lib/pricing";
import {
  catalogCourses,
  enrollmentFor,
  flattenLessons,
  getCourse,
  lessonAccess,
  progressOf,
  resumeLesson,
  teacherInfo,
} from "@/lib/selectors";
import { getEmbedUrl } from "@/lib/youtube";
import type { Lesson } from "@/lib/types";
import { btn } from "@/lib/ui";

interface LearnPageProps {
  params: Promise<{ courseId: string }>;
}

export default function LearnPage({ params }: LearnPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <LoadingAnimation />
        </div>
      }
    >
      <Player params={params} />
    </Suspense>
  );
}

function Player({ params }: LearnPageProps) {
  const { courseId } = use(params);
  const { db, user, hydrated, toggleSaved, setLessonComplete, recordWatch } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("lesson");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const course = getCourse(db, courseId);
  const access = course ? lessonAccess(db, course, user) : null;
  const published = !!course && catalogCourses(db).some((c) => c.id === course.id);
  const visible = !!course && (published || access?.owner || user?.role === "admin");

  const lessons = course ? flattenLessons(course) : [];
  const enrollment = course && user ? enrollmentFor(db, user.id, course.id) : undefined;
  const fallback = course && (access?.full ? resumeLesson(course, enrollment) : lessons.find((f) => f.lesson.isPreview)?.lesson);
  const current = lessons.find((f) => f.lesson.id === requestedId) ?? lessons.find((f) => f.lesson.id === fallback?.id);
  const lesson = current?.lesson;
  const watchable = !!lesson && !!access?.canWatch(lesson);

  // Put the resolved lesson in the URL so refresh/share opens the same lesson
  useEffect(() => {
    if (hydrated && lesson && requestedId !== lesson.id) {
      router.replace(`/learn/${courseId}?lesson=${lesson.id}`);
    }
  }, [hydrated, lesson, requestedId, router, courseId]);

  useEffect(() => {
    if (watchable && lesson && enrollment) recordWatch(courseId, lesson.id);
    // Only when the lesson changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, watchable, !!enrollment]);

  if (!hydrated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (!course || !visible) {
    return (
      <div className="container-custom py-16">
        <EmptyBlock
          title="Course not available"
          description="This course doesn't exist or isn't published."
          action={
            <Link href="/courses" className={btn.primary}>
              Browse courses
            </Link>
          }
        />
      </div>
    );
  }

  const teacher = teacherInfo(db, course.teacherId);
  const progress = progressOf(course, enrollment);
  const completed = new Set(enrollment?.completedLessonIds ?? []);
  const saved = new Set(
    db.savedLessons.filter((s) => s.studentId === user?.id && s.courseId === course.id).map((s) => s.lessonId),
  );
  const prev = current ? lessons[current.index - 1] : undefined;
  const next = current ? lessons[current.index + 1] : undefined;
  const isDone = !!lesson && completed.has(lesson.id);
  const isSaved = !!lesson && saved.has(lesson.id);
  // Guests see the buy prompt too; checkout asks them to log in
  const canBuy = published && (!user || user.role === "student");

  const go = (target: Lesson) => {
    setDrawerOpen(false);
    router.push(`/learn/${courseId}?lesson=${target.id}`);
  };

  const handleSave = () => {
    if (!lesson) return;
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/learn/${courseId}?lesson=${lesson.id}`)}`);
      return;
    }
    const nowSaved = toggleSaved(course.id, lesson.id);
    toast.success(nowSaved ? "Saved to your videos" : "Removed from saved videos");
  };

  const handleComplete = () => {
    if (!lesson) return;
    setLessonComplete(course.id, lesson.id, !isDone);
    if (!isDone && next && access?.canWatch(next.lesson)) go(next.lesson);
  };

  const sidebar = (
    <CurriculumSidebar
      chapters={course.chapters}
      activeLessonId={lesson?.id}
      completed={completed}
      saved={saved}
      canWatch={(l) => !!access?.canWatch(l)}
      onSelect={go}
    />
  );

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      {/* Course header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
          <Link
            href={enrollment && user?.role === "student" ? "/my-classes" : `/courses/${course.id}`}
            className="p-2 rounded-md hover:bg-surface shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bold text-foreground">{course.title}</h1>
            {teacher && (
              <Link href={`/teachers/${teacher.id}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                <Avatar name={teacher.name} src={teacher.avatar} size="w-4 h-4 text-[8px]" />
                {teacher.name}
              </Link>
            )}
          </div>
          {enrollment && (
            <p className="hidden sm:block shrink-0 text-xs text-muted-foreground">
              {progress.completed}/{progress.total} lessons · <b className="text-foreground">{progress.percent}%</b>
            </p>
          )}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`${btn.small} lg:hidden shrink-0`}
            aria-label="Open course curriculum"
          >
            <ListVideo size={16} /> Lessons
          </button>
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className={`${btn.small} hidden lg:inline-flex shrink-0`}
            aria-label={sidebarOpen ? "Hide curriculum" : "Show curriculum"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            Curriculum
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <div className={`mx-auto ${sidebarOpen ? "max-w-5xl" : "max-w-6xl"}`}>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg">
              {lesson && watchable ? (
                <iframe
                  key={lesson.id}
                  src={getEmbedUrl(lesson.videoUrl)}
                  title={lesson.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
                  <Lock size={36} className="mb-3 opacity-80" />
                  <h2 className="text-xl font-bold">This lesson is locked</h2>
                  <p className="mt-1 mb-4 max-w-md text-sm text-white/70">
                    Buy the full course to watch every chapter and lesson.
                  </p>
                  {canBuy && (
                    <Link href={`/checkout?courseId=${course.id}`} className={btn.primary}>
                      Enroll for {formatBDT(coursePrice(course))}
                    </Link>
                  )}
                </div>
              )}
            </div>

            {lesson && current && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Chapter {current.chapterIndex + 1}: {current.chapterTitle}
                </p>
                <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl md:text-2xl font-extrabold text-foreground">{lesson.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDuration(lesson.durationMin)}
                      {isDone && <span className="ml-2 font-semibold text-green-600">· Completed</span>}
                      {!access?.full && lesson.isPreview && <span className="ml-2 font-semibold text-primary">· Free preview</span>}
                    </p>
                  </div>
                  {/* Saving and progress tracking are learner features */}
                  {watchable && (!user || user.role === "student") && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={handleSave} className={isSaved ? btn.primary : btn.secondary} aria-pressed={isSaved}>
                        <Bookmark size={16} className={isSaved ? "fill-current" : ""} />
                        {isSaved ? "Saved" : "Save"}
                      </button>
                      {enrollment && (
                        <button onClick={handleComplete} className={isDone ? btn.secondary : btn.primary} aria-pressed={isDone}>
                          {isDone ? <CheckCircle2 size={16} className="text-green-600" /> : <Circle size={16} />}
                          {isDone ? "Completed" : "Mark complete"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <button disabled={!prev} onClick={() => prev && go(prev.lesson)} className={btn.secondary}>
                    <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span>
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Lesson {current.index + 1} of {lessons.length}
                  </span>
                  <button disabled={!next} onClick={() => next && go(next.lesson)} className={btn.secondary}>
                    <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
                  </button>
                </div>

                {!access?.full && canBuy && (
                  <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm">
                      You&apos;re watching a free preview. Get all {lessons.length} lessons with the full course.
                    </p>
                    <Link href={`/checkout?courseId=${course.id}`} className={`${btn.primary} shrink-0`}>
                      Enroll now
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Desktop curriculum panel */}
        {sidebarOpen && (
          <aside className="hidden lg:block w-[22rem] shrink-0 border-l border-border bg-card">
            <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
              <p className="border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Course content
              </p>
              {sidebar}
            </div>
          </aside>
        )}
      </div>

      {/* Mobile curriculum drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-card"
              role="dialog"
              aria-label="Course curriculum"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="font-bold">Course content</p>
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-md hover:bg-surface" aria-label="Close curriculum">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{sidebar}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
