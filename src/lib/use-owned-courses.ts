"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppStore";
import type { EnrolledCourse } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";

// Ids of the courses the signed-in user has bought (GET /me/enrollments), for
// marking catalog cards as purchased. Students and teachers (who keep courses
// bought before becoming teachers) have purchases; guests and admins get an
// empty set and no request is made.
export function useOwnedCourseIds(): Set<string> {
  const { user } = useApp();
  const buyer = user?.role === "student" || user?.role === "teacher";
  const { data } = useApi<EnrolledCourse[]>(buyer ? "/me/enrollments" : null);
  return useMemo(() => new Set((data ?? []).map((item) => item.course.id)), [data]);
}
