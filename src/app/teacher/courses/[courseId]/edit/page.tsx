"use client";

import { use } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import CourseWizard from "@/components/course/CourseWizard";
import { EmptyBlock, PageHeader } from "@/components/ui/primitives";
import { teacherInfo } from "@/lib/selectors";
import { btn } from "@/lib/ui";
import { useTeacher } from "@/lib/use-teacher";

// The teacher layout provides the Suspense boundary for params
export default function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { db, teacher, courses, saveCourse } = useTeacher();
  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    return (
      <EmptyBlock
        title="Course not found"
        description="This course doesn't exist or belongs to another teacher."
        action={
          <Link href="/teacher/courses" className={btn.primary}>
            Back to my courses
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit course"
        actions={
          <Link href={`/courses/${course.id}`} className={btn.secondary}>
            <Eye size={16} /> View course page
          </Link>
        }
      />
      {/* Keyed by id so creating a draft (which redirects here) starts from the saved data */}
      <CourseWizard key={course.id} initial={course} teacher={teacherInfo(db, teacher.id)!} isNew={false} onSave={saveCourse} />
    </div>
  );
}
