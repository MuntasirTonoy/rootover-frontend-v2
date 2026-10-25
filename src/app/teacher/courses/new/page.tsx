"use client";

import { useState } from "react";
import CourseWizard, { blankCourse } from "@/components/course/CourseWizard";
import { PageHeader } from "@/components/ui/primitives";
import { useTeacher } from "@/lib/use-teacher";

export default function NewCoursePage() {
  const { teacher } = useTeacher();
  const [initial] = useState(() => blankCourse(teacher.id));

  return (
    <div>
      <PageHeader title="Create a course" description="Add the course details, build the curriculum, then submit it for approval." />
      <CourseWizard initial={initial} teacher={teacher} isNew />
    </div>
  );
}
