"use client";

import { useApp } from "@/context/AppStore";
import { getTeacherByUser } from "./selectors";

// The signed-in teacher's profile. Only use under the teacher layout, which
// guarantees the user is an approved teacher.
export function useTeacher() {
  const app = useApp();
  const teacher = getTeacherByUser(app.db, app.user!.id)!;
  return { ...app, teacher, courses: app.db.courses.filter((c) => c.teacherId === teacher.id) };
}
