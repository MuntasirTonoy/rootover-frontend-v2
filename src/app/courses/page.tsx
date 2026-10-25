"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, SearchX } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import LoadingAnimation from "@/components/LoadingAnimation";
import Pagination from "@/components/dashboard/Pagination";
import ApiStatus, { ready } from "@/components/ui/ApiStatus";
import { EmptyBlock, FilterSelect, SearchInput } from "@/components/ui/primitives";
import { withQuery } from "@/lib/api";
import type { CourseSummary, Facets, Paginated } from "@/lib/api-types";
import { useApi, useDebounced } from "@/lib/use-api";
import { LEVELS } from "@/lib/types";
import { btn } from "@/lib/ui";

const priceRanges = [
  // Ranges apply to the price after the course discount (checked by the API)
  { value: "", label: "Any price" },
  { value: "under1000", label: "Under ৳1,000" },
  { value: "1000-2000", label: "৳1,000 – ৳2,000" },
  { value: "over2000", label: "Over ৳2,000" },
];

const sorts = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingAnimation />
        </div>
      }
    >
      <Catalog />
    </Suspense>
  );
}

function Catalog() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [level, setLevel] = useState(params.get("level") ?? "");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [price, setPrice] = useState("");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim());

  // Any filter change goes back to page 1
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  const facets = useApi<Facets>("/courses/facets").data;
  const subjects = facets?.subjects ?? [];
  const teachers = facets?.teachers ?? [];
  // The API filters, sorts and paginates (search covers title, subject, level and teacher name)
  const list = useApi<Paginated<CourseSummary>>(
    withQuery("/courses", { q, level, subject, teacherId: teacher, price, sort, page, limit: 12 }),
  );
  const results = list.data?.data ?? [];
  const total = list.data?.pagination.total ?? 0;

  const hasFilters = q || level || subject || teacher || price;
  const clear = () => {
    setQuery("");
    setLevel("");
    setSubject("");
    setTeacher("");
    setPrice("");
    setPage(1);
  };

  return (
    <div className="container-custom py-10 md:py-14">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs mb-4">
          <BookOpen size={14} /> Course catalog
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Explore courses</h1>
        <p className="text-muted-foreground">
          Complete subject courses from verified teachers. Buy once and get every chapter.
        </p>
      </header>

      <div className="mb-6 space-y-3">
        <SearchInput
          value={query}
          onChange={filter(setQuery)}
          placeholder="Search by course, subject, teacher or level"
        />
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <FilterSelect
            label="Level"
            value={level}
            onChange={filter(setLevel)}
            options={[{ value: "", label: "All levels" }, ...LEVELS.map((l) => ({ value: l, label: l }))]}
          />
          <FilterSelect
            label="Subject"
            value={subject}
            onChange={filter(setSubject)}
            options={[{ value: "", label: "All subjects" }, ...subjects.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            label="Teacher"
            value={teacher}
            onChange={filter(setTeacher)}
            options={[{ value: "", label: "All teachers" }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]}
          />
          <FilterSelect
            label="Price"
            value={price}
            onChange={filter(setPrice)}
            options={priceRanges.map(({ value, label }) => ({ value, label }))}
          />
          <FilterSelect label="Sort by" value={sort} onChange={filter(setSort)} options={sorts} className="sm:ml-auto" />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {list.loading ? "Searching..." : `${total} course${total === 1 ? "" : "s"} found`}
          </span>
          {hasFilters && (
            <button onClick={clear} className="font-semibold text-primary hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {!ready(list) ? (
        <ApiStatus state={list} />
      ) : results.length > 0 ? (
        <>
          <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 ${list.loading ? "opacity-60" : ""}`}>
            {results.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={list.data.pagination.pages}
            onPageChange={setPage}
            isLoading={list.loading}
          />
        </>
      ) : (
        <EmptyBlock
          icon={SearchX}
          title="No courses match your search"
          description="Try a different keyword or remove some filters."
          action={
            <button onClick={clear} className={btn.secondary}>
              Clear filters
            </button>
          }
        />
      )}
    </div>
  );
}
