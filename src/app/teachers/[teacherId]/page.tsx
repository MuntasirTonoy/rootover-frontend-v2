"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import { BadgeCheck, BookOpen, Building2, GraduationCap, Star, UserX, Users } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import { useTeacherStats } from "@/components/course/TeacherCard";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Avatar, EmptyBlock } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { formatDate } from "@/lib/format";
import { teacherInfo } from "@/lib/selectors";
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
  const { db } = useApp();
  const teacher = teacherInfo(db, teacherId);
  const stats = useTeacherStats(teacherId);

  if (!teacher || teacher.status !== "active") {
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

  return (
    <div className="pb-16">
      <section className="bg-surface border-b border-border">
        <div className="container-custom py-10 flex flex-col md:flex-row gap-6 md:items-center">
          <Avatar name={teacher.name} src={teacher.avatar} size="w-24 h-24 text-2xl" />
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-3xl font-extrabold text-foreground">
              {teacher.name} <BadgeCheck className="text-primary" aria-label="Verified teacher" />
            </h1>
            <p className="text-lg text-muted-foreground">{teacher.headline}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {teacher.institution && (
                <span className="flex items-center gap-1.5">
                  <Building2 size={15} /> {teacher.institution}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <BookOpen size={15} /> {stats.courses.length} courses
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={15} /> {stats.students} students
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={15} /> {stats.rating ? `${stats.rating.toFixed(1)} (${stats.reviewCount} reviews)` : "No reviews yet"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom grid lg:grid-cols-3 gap-8 pt-8">
        <aside className="space-y-4">
          <div className="rounded-lg border border-border p-5">
            <h2 className="font-bold mb-2">About</h2>
            <p className="text-sm text-muted-foreground">{teacher.bio || "This teacher hasn't added a bio yet."}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {teacher.experienceYears} years of experience · Teaching on Root Over since {formatDate(teacher.joinedAt)}
            </p>
          </div>
          {teacher.qualifications.length > 0 && (
            <div className="rounded-lg border border-border p-5">
              <h2 className="font-bold mb-2 flex items-center gap-2">
                <GraduationCap size={18} className="text-primary" /> Qualifications
              </h2>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {teacher.qualifications.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <section className="lg:col-span-2">
          <h2 className="text-lg font-bold mb-4">Courses by {teacher.name}</h2>
          {stats.courses.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              {stats.courses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No published courses yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
