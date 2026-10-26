"use client";

import { createContext, useContext } from "react";
import { api } from "./api";
import type { TeacherPublic } from "./api-types";
import type { Course, TeacherApplication } from "./types";

export interface TeacherMe {
  teacher: TeacherPublic;
  // Identity numbers arrive masked (017•••••999)
  application: TeacherApplication | null;
}

export interface TeacherContextValue extends TeacherMe {
  // Re-reads GET /teacher/me (e.g. after the profile was edited)
  reload: () => void;
}

export const TeacherContext = createContext<TeacherContextValue | null>(null);

// The signed-in teacher (from GET /teacher/me). Only use under the teacher
// layout, which loads it and renders its pages only for approved teachers.
export function useTeacher(): TeacherContextValue {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error("useTeacher must be used inside the teacher layout");
  return ctx;
}

// The editor's course as the API's course body. Client-made ids of new
// chapters/lessons are sent too; the API keeps ids it knows and replaces the
// rest, so always continue from the course it returns.
function courseBody(course: Course) {
  return {
    level: course.level,
    subject: course.subject,
    title: course.title,
    description: course.description,
    // An uploaded thumbnail's url (the API checks it's this teacher's upload), or null
    thumbnail: course.thumbnail || null,
    outcomes: course.outcomes,
    price: course.price,
    discountPrice: course.discountPrice ?? null,
    chapters: course.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      lessons: ch.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        durationMin: l.durationMin,
        videoUrl: l.videoUrl,
        noteLink: l.noteLink?.trim() || null,
        isPreview: l.isPreview,
      })),
    })),
  };
}

// Creates (isNew, always a draft) or saves the whole course. Saving never
// changes the status; a live or under-review course must stay complete.
export const saveCourse = (course: Course, isNew: boolean) =>
  isNew
    ? api<Course>("/teacher/courses", { method: "POST", body: courseBody(course) })
    : api<Course>(`/teacher/courses/${course.id}`, { method: "PUT", body: courseBody(course) });

// draft/rejected -> pending, after the API's full check of the SAVED course
export const submitCourse = (id: string) => api<Course>(`/teacher/courses/${id}/submit`, { method: "POST" });

// API field keys (chapters.1.lessons.0.videoUrl) -> the editor's error keys
export function editorErrors(fields: Record<string, string>, course: Course): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(fields)) {
    const m = key.match(/^chapters\.(\d+)(?:\.(title|lessons)(?:\.(\d+)\.(\w+))?)?$/);
    if (!m) {
      out[key] = message;
      continue;
    }
    const chapter = course.chapters[Number(m[1])];
    if (!chapter) continue;
    if (m[2] === "title") out[`ch-${chapter.id}`] = message;
    else if (m[2] === "lessons" && m[3] === undefined) out[`ch-${chapter.id}-lessons`] = message;
    else if (m[3] !== undefined) {
      const lesson = chapter.lessons[Number(m[3])];
      const suffix = { title: "title", durationMin: "duration", videoUrl: "url", noteLink: "note" }[m[4]] ?? m[4];
      if (lesson) out[`l-${lesson.id}-${suffix}`] = message;
    }
  }
  return out;
}
