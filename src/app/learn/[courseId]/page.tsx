"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Star,
} from "lucide-react";
import CurriculumSidebar from "@/components/course/CurriculumSidebar";
import RateCourseForm from "@/components/course/RateCourseForm";
import Modal from "@/components/ui/Modal";
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
  const [ratingOpen, setRatingOpen] = useState(false);
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
    // Picking from the curriculum below the video should land on the new lesson's details
    router.push(`/learn/${courseId}?lesson=${target.id}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const isLearner = !user || user.role === "student";
  const showSave = watchable && isLearner;
  const showReport = watchable && user?.role === "student";
  const showComplete = watchable && isLearner && !!enrollment;

  const contentHeader = (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Course content</p>
      <p className="text-xs text-muted-foreground">
        {enrollment ? `${progress.completed}/${progress.total} done` : `${lessons.length} lessons`}
      </p>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-background">
      {/* Course header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 lg:px-6">
          <Link
            href={enrollment && user?.role === "student" ? "/my-classes" : `/courses/${course.id}`}
            className="shrink-0 rounded-md p-2 hover:bg-surface"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-foreground sm:text-base">{course.title}</h1>
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <Link href={`/teachers/${teacher.id}`} className="flex min-w-0 items-center gap-1.5 hover:text-primary">
                <Avatar name={teacher.name} src={teacher.avatar} size="w-4 h-4 text-[8px]" />
                <span className="truncate">{teacher.name}</span>
              </Link>
              {course.rating.count > 0 && (
                <span className="flex shrink-0 items-center gap-0.5">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <b className="text-amber-500">{course.rating.average.toFixed(1)}</b>
                  <span className="max-sm:hidden">({course.rating.count})</span>
                </span>
              )}
            </div>
          </div>
          {enrollment && (
            <div className="shrink-0 text-right">
              <p className="text-sm font-extrabold leading-none text-foreground">{progress.percent}%</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {progress.completed}/{progress.total}
                <span className="max-sm:hidden"> lessons</span>
              </p>
            </div>
          )}
          {/* max-lg:hidden, not hidden + lg:inline-flex: btn.small already sets inline-flex */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className={`${btn.small} shrink-0 max-lg:hidden`}
            aria-label={sidebarOpen ? "Hide curriculum" : "Show curriculum"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            Curriculum
          </button>
        </div>
        {enrollment && (
          <div className="h-1 w-full bg-muted/20" aria-hidden>
            <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${progress.percent}%` }} />
          </div>
        )}
      </header>

      <div className="flex flex-1">
        <main className="min-w-0 flex-1 lg:p-6">
          <div className={`mx-auto ${sidebarOpen ? "max-w-5xl" : "max-w-6xl"}`}>
            {/* Edge-to-edge and pinned under the navbar on phones/tablets, so the
                video stays in view while scrolling the course content below */}
            <div className="sticky top-20 z-20 aspect-video w-full overflow-hidden bg-black lg:static lg:rounded-xl lg:shadow-lg">
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
              <div className="space-y-4 px-4 pt-4 pb-8 sm:px-6 lg:px-0 lg:pt-6">
                {/* Lesson details */}
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <p className="min-w-0 truncate font-semibold uppercase tracking-wide text-primary">
                      Chapter {current.chapterIndex + 1} · {current.chapterTitle}
                    </p>
                    <p className="shrink-0 text-muted-foreground">
                      Lesson {current.index + 1} of {lessons.length}
                    </p>
                  </div>
                  <h2 className="mt-1.5 text-xl font-extrabold leading-snug text-foreground lg:text-2xl">{lesson.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-muted-foreground">
                      <Clock size={12} /> {formatDuration(lesson.durationMin)}
                    </span>
                    {isDone && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 font-semibold text-green-700 dark:text-green-400">
                        <CheckCircle2 size={12} /> Completed
                      </span>
                    )}
                    {!access.full && lesson.isPreview && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">Free preview</span>
                    )}
                  </div>
                </div>

                {/* Actions: on phones "Mark complete" gets its own full-width row and the
                    rest share an equal-width row; from sm up it's one toolbar */}
                {(showComplete || showSave || showReport || lesson.noteLink) && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {showComplete && (
                      <button
                        onClick={handleComplete}
                        className={`${isDone ? btn.secondary : btn.primary} w-full sm:order-last sm:ml-auto sm:w-auto`}
                        aria-pressed={isDone}
                      >
                        {isDone ? <CheckCircle2 size={16} className="text-green-600" /> : <Circle size={16} />}
                        {isDone ? "Completed" : "Mark as complete"}
                      </button>
                    )}
                    <div className="grid auto-cols-fr grid-flow-col gap-2 sm:flex">
                      {showSave && (
                        <button
                          onClick={handleSave}
                          className={`${btn.secondary} max-sm:px-2! ${isSaved ? "border-primary/40 text-primary" : ""}`}
                          aria-pressed={isSaved}
                        >
                          <Bookmark size={16} className={isSaved ? "fill-current" : ""} />
                          {isSaved ? "Saved" : "Save"}
                        </button>
                      )}
                      {/* The API only sends the link to people who can watch this lesson */}
                      {lesson.noteLink && (
                        <a
                          href={lesson.noteLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${btn.secondary} max-sm:px-2!`}
                        >
                          <FileText size={16} /> Notes
                        </a>
                      )}
                      {showReport && enrollment && (
                        <button
                          onClick={() => setRatingOpen(true)}
                          className={`${btn.secondary} max-sm:px-2! ${course.myReview ? "border-amber-400/50" : ""}`}
                        >
                          <Star size={16} className={course.myReview ? "fill-amber-400 text-amber-400" : ""} />
                          {course.myReview ? `Rated ${course.myReview.rating}` : "Rate"}
                        </button>
                      )}
                      {showReport && (
                        <ReportVideoButton
                          courseId={course.id}
                          lessonId={lesson.id}
                          lessonTitle={lesson.title}
                          reported={reportedIds.has(lesson.id)}
                          onReported={() => change({ reported: new Set(reportedIds).add(lesson.id) })}
                          className="max-sm:px-2!"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Previous / next */}
                <nav className="grid grid-cols-2 gap-2 sm:gap-3" aria-label="Lesson navigation">
                  <LessonNavButton direction="prev" target={prev?.lesson} onGo={go} />
                  <LessonNavButton direction="next" target={next?.lesson} onGo={go} />
                </nav>

                {!access.full && canBuy && (
                  <div className="flex flex-col justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
                    <p className="text-sm">
                      You&apos;re watching a free preview. Get all {lessons.length} lessons with the full course.
                    </p>
                    <Link href={`/checkout?courseId=${course.id}`} className={`${btn.primary} shrink-0`}>
                      Enroll for {formatBDT(course.effectivePrice)}
                    </Link>
                  </div>
                )}

                {/* Phones and tablets: the curriculum sits under the lesson (the video stays pinned above) */}
                <section className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
                  {contentHeader}
                  {sidebar}
                </section>
              </div>
            )}
          </div>
        </main>

        <Modal open={ratingOpen} onClose={() => setRatingOpen(false)} title="Rate this course" size="md">
          <RateCourseForm
            courseId={course.id}
            myReview={course.myReview}
            onSaved={() => {
              setRatingOpen(false);
              player.reload();
            }}
          />
        </Modal>

        {/* Desktop curriculum panel */}
        {sidebarOpen && (
          <aside className="w-[22rem] shrink-0 border-l border-border bg-card max-lg:hidden">
            <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
              {contentHeader}
              {sidebar}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function LessonNavButton({
  direction,
  target,
  onGo,
}: {
  direction: "prev" | "next";
  target?: LessonPublic;
  onGo: (lesson: LessonPublic) => void;
}) {
  const isNext = direction === "next";
  return (
    <button
      disabled={!target}
      onClick={() => target && onGo(target)}
      className={`flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 ${
        isNext ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      {isNext ? <ChevronRight size={18} className="shrink-0" /> : <ChevronLeft size={18} className="shrink-0" />}
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {isNext ? "Next" : "Previous"}
        </span>
        <span className="block truncate text-sm font-semibold text-foreground">
          {target ? target.title : isNext ? "End of course" : "Start of course"}
        </span>
      </span>
    </button>
  );
}
