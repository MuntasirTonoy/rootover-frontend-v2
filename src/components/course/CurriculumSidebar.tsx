"use client";

import { useState } from "react";
import { Bookmark, CheckCircle2, ChevronDown, Circle, Lock, PlayCircle } from "lucide-react";
import { formatDuration } from "@/lib/format";
// The fields shown here; fits the API's LessonPublic
interface SidebarLesson {
  id: string;
  title: string;
  durationMin: number;
  isPreview: boolean;
}

interface CurriculumSidebarProps<L extends SidebarLesson> {
  chapters: { id: string; title: string; lessons: L[] }[];
  activeLessonId?: string;
  completed: Set<string>;
  saved: Set<string>;
  canWatch: (lesson: L) => boolean;
  onSelect: (lesson: L) => void;
}

// Chapter/lesson navigator for the course player
export default function CurriculumSidebar<L extends SidebarLesson>({
  chapters,
  activeLessonId,
  completed,
  saved,
  canWatch,
  onSelect,
}: CurriculumSidebarProps<L>) {
  const activeChapter = chapters.find((c) => c.lessons.some((l) => l.id === activeLessonId))?.id;
  // Chapters the user explicitly toggled; the active chapter is open by default
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => toggled[id] ?? id === activeChapter;

  return (
    <div className="divide-y divide-border">
      {chapters.map((chapter, ci) => {
        const done = chapter.lessons.filter((l) => completed.has(l.id)).length;
        const open = isOpen(chapter.id);
        return (
          <div key={chapter.id}>
            <button
              onClick={() => setToggled((t) => ({ ...t, [chapter.id]: !open }))}
              aria-expanded={open}
              className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-surface"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {ci + 1}. {chapter.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {done}/{chapter.lessons.length} completed ·{" "}
                  {formatDuration(chapter.lessons.reduce((s, l) => s + l.durationMin, 0))}
                </p>
              </div>
              <ChevronDown size={16} className={`mt-1 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <ul className="pb-2">
                {chapter.lessons.map((lesson, li) => {
                  const active = lesson.id === activeLessonId;
                  const watchable = canWatch(lesson);
                  const isDone = completed.has(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => onSelect(lesson)}
                        aria-current={active ? "true" : undefined}
                        className={`flex w-full items-start gap-3 border-l-4 px-4 py-2.5 text-left transition-colors ${
                          active ? "border-primary bg-primary/10" : "border-transparent hover:bg-surface"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {!watchable ? (
                            <Lock size={16} className="text-muted-foreground" />
                          ) : isDone ? (
                            <CheckCircle2 size={16} className="text-green-600" aria-label="Completed" />
                          ) : active ? (
                            <PlayCircle size={16} className="text-primary" />
                          ) : (
                            <Circle size={16} className="text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm ${active ? "font-bold text-foreground" : "text-foreground"}`}>
                            Part {li + 1}: {lesson.title}
                          </span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {formatDuration(lesson.durationMin)}
                            {lesson.isPreview && <span className="font-bold text-primary">Preview</span>}
                            {saved.has(lesson.id) && <Bookmark size={11} className="fill-current text-primary" aria-label="Saved" />}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
