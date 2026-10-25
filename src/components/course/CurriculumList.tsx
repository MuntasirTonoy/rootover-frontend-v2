"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Lock, PlayCircle } from "lucide-react";
import { formatDuration } from "@/lib/format";
import type { Chapter, Lesson } from "@/lib/types";

interface CurriculumListProps {
  chapters: Chapter[];
  // When given, previewable lessons link into the player
  courseId?: string;
  canWatch?: (lesson: Lesson) => boolean;
}

// Read-only chapter/lesson accordion for course pages and the wizard review step
export default function CurriculumList({ chapters, courseId, canWatch }: CurriculumListProps) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    chapters[0] ? { [chapters[0].id]: true } : {},
  );

  if (chapters.length === 0) {
    return <p className="text-sm text-muted-foreground">No chapters added yet.</p>;
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {chapters.map((chapter, ci) => {
        const isOpen = !!open[chapter.id];
        const minutes = chapter.lessons.reduce((s, l) => s + l.durationMin, 0);
        return (
          <div key={chapter.id}>
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [chapter.id]: !isOpen }))}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 bg-surface/60 px-4 py-3 text-left hover:bg-surface"
            >
              <span className="font-semibold text-foreground">
                Chapter {ci + 1}: {chapter.title}
              </span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                {chapter.lessons.length} lessons · {formatDuration(minutes)}
                <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
            {isOpen && (
              <ul className="bg-card">
                {chapter.lessons.map((lesson, li) => {
                  const watchable = courseId && canWatch?.(lesson);
                  const content = (
                    <>
                      {watchable ? (
                        <PlayCircle size={16} className="text-primary shrink-0" />
                      ) : (
                        <Lock size={15} className="text-muted-foreground shrink-0" />
                      )}
                      <span className="flex-1 text-sm text-foreground">
                        Part {li + 1}: {lesson.title}
                      </span>
                      {lesson.isPreview && (
                        <span className="text-[11px] font-bold text-primary">Preview</span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDuration(lesson.durationMin)}</span>
                    </>
                  );
                  return (
                    <li key={lesson.id} className="border-t border-border/60 first:border-t-0">
                      {watchable ? (
                        <Link
                          href={`/learn/${courseId}?lesson=${lesson.id}`}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface/60"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2.5">{content}</div>
                      )}
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
