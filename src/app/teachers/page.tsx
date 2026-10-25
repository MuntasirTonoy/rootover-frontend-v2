"use client";

import { useState } from "react";
import { UserSearch } from "lucide-react";
import TeacherCard from "@/components/course/TeacherCard";
import { EmptyBlock, SearchInput } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { catalogCourses, teacherInfo } from "@/lib/selectors";

export default function TeachersPage() {
  const { db } = useApp();
  const [query, setQuery] = useState("");
  const courses = catalogCourses(db);

  const q = query.trim().toLowerCase();
  const teachers = db.teachers
    .map((t) => teacherInfo(db, t.id)!)
    .filter((t) => t.status === "active" && courses.some((c) => c.teacherId === t.id))
    .filter(
      (t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q) ||
        courses.some((c) => c.teacherId === t.id && c.subject.toLowerCase().includes(q)),
    );

  return (
    <div className="container-custom py-10 md:py-14">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Our teachers</h1>
      <p className="text-muted-foreground mb-6">Every teacher is verified by Root Over before publishing courses.</p>
      <SearchInput value={query} onChange={setQuery} placeholder="Search teachers or subjects" className="mb-6 max-w-md" />
      {teachers.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teachers.map((t) => (
            <TeacherCard key={t.id} teacher={t} />
          ))}
        </div>
      ) : (
        <EmptyBlock icon={UserSearch} title="No teachers found" description="Try another name or subject." />
      )}
    </div>
  );
}
