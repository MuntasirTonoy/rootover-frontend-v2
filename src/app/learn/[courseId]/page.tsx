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
  FileText,
  ListVideo,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import CurriculumSidebar from "@/components/course/CurriculumSidebar";
import ReportVideoButton from "@/components/course/ReportVideoButton";
import LoadingAnimation from "@/components/LoadingAnimation";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { Avatar, EmptyBlock } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { api, errorMessage } from "@/lib/api";
import type { ChapterPublic, LessonPublic, PlayerData, Progress } from "@/lib/api-types";
import { formatBDT, formatDuration } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { btn } from "@/lib/ui";

// Lessons in curriculum order with their chapter, for prev/next navigation
const flatten = (chapters: ChapterPublic[]) =>
  chapters.flatMap((ch, chapterIndex) =>
    ch.lessons.map((lesson) => ({ lesson, chapterIndex, chapterTitle: ch.title })),
  ).map((f, index) => ({ ...f, index }));

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
  const { user } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("lesson");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Optimistic copies of what the student changes here, tied to the response
  // they were made on: fresh server data (reload, another course) drops them
  const [local, setLocal] = useState<{
    base?: PlayerData;
    saved?: Set<string>;
    completed?: Set<string>;
    progress?: Progress;
    // Lessons this student has an unresolved report on
    reported?: Set<string>;
  }>({});

  // Visibility and locking come from the API: locked lessons have no video link
  const player = useApi<PlayerData>(`/learn/${courseId}`);
  const course = player.data?.course;
  const enrollment = course?.enrollment;

  const lessons = course ? flatten(course.chapters) : [];
  const fallbackId = course?.access.full
    ? (enrollment?.resumeLessonId ?? lessons[0]?.lesson.id)
    : lessons.find((f) => f.lesson.isPreview)?.lesson.id;
  const current = lessons.find((f) => f.lesson.id === requestedId) ?? lessons.find((f) => f.lesson.id === fallbackId);
  const lesson = current?.lesson;
  const watchable = !!lesson?.canWatch;

  // Put the resolved lesson in the URL so refresh/share opens the same lesson
  useEffect(() => {
    if (lesson && requestedId !== lesson.id) {
      router.replace(`/learn/${courseId}?lesson=${lesson.id}`);
    }
  }, [lesson, requestedId, router, courseId]);

  // "Continue learning" position; the API ignores it unless the student is enrolled
  useEffect(() => {
    if (watchable && lesson && enrollment && user?.role === "student")
      void api(`/learn/${courseId}/lessons/${lesson.id}/watch`, { method: "POST" }).catch(() => undefined);
    // Only when the lesson changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, watchable, !!enrollment]);

  if (!ready(player) && player.error?.status !== 404) return <ApiStatus state={player} className="min-h-[70vh]" />;

  if (!course) {
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

  const { teacher, access, published } = course;
  const localNow = local.base === player.data ? local : {};
  const change = (patch: Omit<typeof local, "base">) =>
    setLocal((prev) => ({ ...(prev.base === player.data ? prev : {}), ...patch, base: player.data }));
  const progress = localNow.progress ?? enrollment?.progress ?? { completed: 0, total: lessons.length, percent: 0 };
  const completedIds = localNow.completed ?? new Set(enrollment?.completedLessonIds ?? []);
  const savedIds = localNow.saved ?? new Set(player.data!.savedLessonIds);
  const reportedIds = localNow.reported ?? new Set(player.data!.myOpenReportLessonIds);
  const prev = current ? lessons[current.index - 1] : undefined;
  const next = current ? lessons[current.index + 1] : undefined;
  const isDone = !!lesson && completedIds.has(lesson.id);
  const isSaved = !!lesson && savedIds.has(lesson.id);
  // Guests see the buy prompt too; checkout asks them to log in
  const canBuy = published && (!user || user.role === "student");

  const go = (target: LessonPublic) => {
    setDrawerOpen(false);
    router.push(`/learn/${courseId}?lesson=${target.id}`);
  };

  const handleSave = async () => {
    if (!lesson) return;
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/learn/${courseId}?lesson=${lesson.id}`)}`);
      return;
    }
    const toggled = new Set(savedIds);
    if (isSaved) toggled.delete(lesson.id);
    else toggled.add(lesson.id);
    change({ saved: toggled });
    try {
      if (isSaved) await api(`/me/saved-lessons/${lesson.id}`, { method: "DELETE" });
      else await api("/me/saved-lessons", { method: "POST", body: { courseId, lessonId: lesson.id } });
      toast.success(isSaved ? "Removed from saved videos" : "Saved to your videos");
    } catch (err) {
      change({ saved: savedIds });
      toast.error(errorMessage(err));
    }
  };

  const handleComplete = async () => {
    if (!lesson) return;
    const done = !isDone;
    const toggled = new Set(completedIds);
    if (done) toggled.add(lesson.id);
    else toggled.delete(lesson.id);
    change({ completed: toggled });
    if (done && next?.lesson.canWatch) go(next.lesson);
    try {
      const res = await api<{ progress: Progress }>(`/learn/${courseId}/lessons/${lesson.id}/complete`, {
        method: "PUT",
        body: { done },
      });
      change({ completed: toggled, progress: res.progress });
    } catch (err) {
      change({ completed: completedIds });
      toast.error(errorMessage(err));
    }
  };

  const sidebar = (
    <CurriculumSidebar
      chapters={course.chapters}
      activeLessonId={lesson?.id}
      completed={completedIds}
      saved={savedIds}
      canWatch={(l) => l.canWatch}
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
            <h1 className="truncate text-sm sm:text-base font-bold text-foreground">{course.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href={`/teachers/${teacher.id}`} className="flex min-w-0 items-center gap-1.5 hover:text-primary">
                <Avatar name={teacher.name} src={teacher.avatar} size="w-4 h-4 text-[8px]" />
                <span className="truncate">{teacher.name}</span>
              </Link>
              {/* Progress moves here on phones; the header has no room for it */}
              {enrollment && (
                <span className="sm:hidden shrink-0">
                  · <b className="text-foreground">{progress.percent}%</b>
                </span>
              )}
            </div>
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
        <main className="min-w-0 flex-1 sm:p-4 lg:p-6">
          <div className={`mx-auto ${sidebarOpen ? "max-w-5xl" : "max-w-6xl"}`}>
            {/* Edge-to-edge on phones, rounded card from sm up */}
            <div className="aspect-video w-full overflow-hidden bg-black sm:rounded-lg sm:shadow-lg">
              {lesson && watchable ? (
                <iframe
                  key={lesson.id}
                  src={lesson.videoUrl ?? undefined}
                  title={lesson.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-4 sm:p-6 text-center text-white">
                  <Lock className="mb-2 sm:mb-3 h-7 w-7 sm:h-9 sm:w-9 opacity-80" />
                  <h2 className="text-base sm:text-xl font-bold">This lesson is locked</h2>
                  <p className="mt-1 mb-3 sm:mb-4 max-w-md text-xs sm:text-sm text-white/70">
                    Buy the full course to watch every lesson.
                  </p>
                  {canBuy && (
                    <Link href={`/checkout?courseId=${course.id}`} className={`${btn.primary} py-2 text-xs sm:py-2.5 sm:text-sm`}>
                      Enroll for {formatBDT(course.effectivePrice)}
                    </Link>
                  )}
                </div>
              )}
            </div>

            {lesson && current && (
              <div className="mt-4 sm:mt-5 px-4 sm:px-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Chapter {current.chapterIndex + 1}: {current.chapterTitle}
                </p>
                {/* Title and actions side by side only when there's room (lg) */}
                <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-foreground">{lesson.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDuration(lesson.durationMin)}
                      {isDone && <span className="ml-2 font-semibold text-green-600">· Completed</span>}
                      {!access.full && lesson.isPreview && <span className="ml-2 font-semibold text-primary">· Free preview</span>}
                    </p>
                    {/* The API only sends the link to people who can watch this lesson */}
                    {lesson.noteLink && (
                      <a
                        href={lesson.noteLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${btn.small} mt-2 inline-flex`}
                      >
                        <FileText size={14} /> Download notes
                      </a>
                    )}
                  </div>
                  {/* Saving and progress tracking are learner features */}
                  {watchable && (!user || user.role === "student") && (
                    // Equal-width row on phones/tablets so the buttons never wrap unevenly
                    <div className="grid auto-cols-fr grid-flow-col gap-2 lg:flex lg:shrink-0">
                      {user?.role === "student" && (
                        <ReportVideoButton
                          courseId={course.id}
                          lessonId={lesson.id}
                          lessonTitle={lesson.title}
                          reported={reportedIds.has(lesson.id)}
                          onReported={() => change({ reported: new Set(reportedIds).add(lesson.id) })}
                          className="w-full max-sm:px-2!"
                        />
                      )}
                      <button
                        onClick={handleSave}
                        className={`${isSaved ? btn.primary : btn.secondary} w-full max-sm:px-2!`}
                        aria-pressed={isSaved}
                      >
                        <Bookmark size={16} className={isSaved ? "fill-current" : ""} />
                        {isSaved ? "Saved" : "Save"}
                      </button>
                      {enrollment && (
                        <button
                          onClick={handleComplete}
                          className={`${isDone ? btn.secondary : btn.primary} w-full max-sm:px-2!`}
                          aria-pressed={isDone}
                        >
                          {isDone ? <CheckCircle2 size={16} className="text-green-600" /> : <Circle size={16} />}
                          {isDone ? "Done" : <><span className="sm:hidden">Complete</span><span className="hidden sm:inline">Mark complete</span></>}
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

                {!access.full && canBuy && (
                  <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm">
                      You&apos;re watching a free preview. Get all {lessons.length} lessons with the full course.
                    </p>
                    <Link href={`/checkout?courseId=${course.id}`} className={`${btn.primary} shrink-0`}>
                      Enroll now
                    </Link>
                  </div>
                )}

                {/* Phones and tablets have no side panel, so list the course content inline too */}
                <section className="lg:hidden mt-6 mb-6 overflow-hidden rounded-lg border border-border bg-card">
                  <p className="border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Course content
                  </p>
                  {sidebar}
                </section>
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
