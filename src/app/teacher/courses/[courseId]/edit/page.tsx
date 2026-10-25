"use client";

import { use } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import CourseWizard from "@/components/course/CourseWizard";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock, PageHeader } from "@/components/ui/primitives";
import type { Course } from "@/lib/types";
import { btn } from "@/lib/ui";
import { useApi } from "@/lib/use-api";
import { useTeacher } from "@/lib/use-teacher";

// The teacher layout provides the Suspense boundary for params
export default function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { teacher } = useTeacher();
  // The full course with every lesson link; 404 for courses of other teachers
  const detail = useApi<Course>(`/teacher/courses/${courseId}`);

  if (!ready(detail) && detail.error?.status !== 404) return <ApiStatus state={detail} />;
  const course = detail.data;

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
      <CourseWizard key={course.id} initial={course} teacher={teacher} isNew={false} />
    </div>
  );
}
