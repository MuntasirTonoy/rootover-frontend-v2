"use client";

import { useState } from "react";
import { UserSearch } from "lucide-react";
import TeacherCard from "@/components/course/TeacherCard";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock, SearchInput } from "@/components/ui/primitives";
import { withQuery } from "@/lib/api";
import type { TeacherPublic } from "@/lib/api-types";
import { useApi, useDebounced } from "@/lib/use-api";

export default function TeachersPage() {
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim());
  // Active teachers with published courses, most students first; q matches name, headline or subject
  const list = useApi<TeacherPublic[]>(withQuery("/teachers", { q }));
  const teachers = list.data ?? [];

  return (
    <div className="container-custom py-10 md:py-14">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Our teachers</h1>
      <p className="text-muted-foreground mb-6">Every teacher is verified by Root Over before publishing courses.</p>
      <SearchInput value={query} onChange={setQuery} placeholder="Search teachers or subjects" className="mb-6 max-w-md" />
      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : teachers.length ? (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${list.loading ? "opacity-60" : ""}`}>
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
