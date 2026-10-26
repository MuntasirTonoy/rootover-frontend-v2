"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import { BadgeCheck, BookOpen, Briefcase, Building2, CalendarDays, GraduationCap, Star, UserX, Users } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import LoadingAnimation from "@/components/LoadingAnimation";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { Avatar, EmptyBlock } from "@/components/ui/primitives";
import type { CourseSummary, TeacherPublic } from "@/lib/api-types";
import { formatDate } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { btn } from "@/lib/ui";

interface TeacherPageProps {
  params: Promise<{ teacherId: string }>;
}

export default function TeacherProfilePage({ params }: TeacherPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingAnimation />
        </div>
      }
    >
      <TeacherProfile params={params} />
    </Suspense>
  );
}

function TeacherProfile({ params }: TeacherPageProps) {
  const { teacherId } = use(params);
  // 404 for unknown or banned teachers; courses are their published ones
  const profile = useApi<{ teacher: TeacherPublic; courses: CourseSummary[] }>(`/teachers/${teacherId}`);

  if (!ready(profile) && profile.error?.status !== 404) return <ApiStatus state={profile} className="min-h-[60vh]" />;
  if (!profile.data) {
    return (
      <div className="container-custom py-16">
        <EmptyBlock
          icon={UserX}
          title="Teacher not found"
          description="This teacher profile doesn't exist or is no longer available."
          action={
            <Link href="/teachers" className={btn.primary}>
              Browse teachers
            </Link>
          }
        />
      </div>
    );
  }

  const { teacher, courses } = profile.data;
  const { stats } = teacher;

  const statItems = [
    { icon: BookOpen, value: stats.courses, label: stats.courses === 1 ? "Course" : "Courses" },
    { icon: Users, value: stats.students, label: stats.students === 1 ? "Student" : "Students" },
    {
      icon: Star,
      value: stats.rating ? stats.rating.toFixed(1) : "–",
      label: stats.rating ? `${stats.reviewCount} ${stats.reviewCount === 1 ? "rating" : "ratings"}` : "No ratings yet",
    },
    { icon: Briefcase, value: `${teacher.experienceYears}+`, label: "Years experience" },
  ];

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div className="container-custom relative py-10">
          {/* Photo on the left, everything about the teacher beside it (stacked on phones) */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
            <Avatar
              name={teacher.name}
              src={teacher.avatar}
              size="w-28 h-28 lg:w-36 lg:h-36 text-3xl lg:text-4xl shrink-0 ring-4 ring-background shadow-md"
            />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-3xl font-extrabold text-foreground">
                <span className="truncate">{teacher.name}</span>
                <BadgeCheck className="shrink-0 text-primary" aria-label="Verified teacher" />
              </h1>
              {teacher.headline && <p className="mt-1 text-lg font-medium text-muted-foreground">{teacher.headline}</p>}
              {/* Bio sits right under the headline */}
              <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line">
                {teacher.bio || "This teacher hasn't added a bio yet."}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {teacher.institution && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={15} /> {teacher.institution}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={15} /> Teaching since {formatDate(teacher.joinedAt)}
                </span>
              </div>
              {teacher.qualifications.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Qualifications">
                  {teacher.qualifications.map((q) => (
                    <li
                      key={q}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm"
                    >
                      <GraduationCap size={14} className="text-primary" /> {q}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Stats */}
          <dl className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {statItems.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={18} />
                </span>
                <div className="flex min-w-0 flex-col-reverse">
                  <dt className="truncate text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-xl font-extrabold leading-tight text-foreground">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="container-custom pt-10">
        <h2 className="text-xl font-bold mb-5">Courses by {teacher.name}</h2>
        {courses.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No published courses yet.</p>
        )}
      </section>
    </div>
  );
}
