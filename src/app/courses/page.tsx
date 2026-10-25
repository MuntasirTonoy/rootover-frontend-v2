"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, SearchX } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import LoadingAnimation from "@/components/LoadingAnimation";
import { EmptyBlock, FilterSelect, SearchInput } from "@/components/ui/primitives";
import { useApp } from "@/context/AppStore";
import { coursePrice } from "@/lib/pricing";
import { catalogCourses, courseRating, courseStudentCount, teacherInfo } from "@/lib/selectors";
import { LEVELS } from "@/lib/types";
import { btn } from "@/lib/ui";

const priceRanges = [
  { value: "", label: "Any price", test: () => true },
  { value: "under1000", label: "Under ৳1,000", test: (p: number) => p < 1000 },
  { value: "1000-2000", label: "৳1,000 – ৳2,000", test: (p: number) => p >= 1000 && p <= 2000 },
  { value: "over2000", label: "Over ৳2,000", test: (p: number) => p > 2000 },
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
  const { db } = useApp();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [level, setLevel] = useState(params.get("level") ?? "");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [price, setPrice] = useState("");
  const [sort, setSort] = useState("popular");

  const all = catalogCourses(db);
  const subjects = [...new Set(all.map((c) => c.subject))].sort();
  const teachers = [...new Set(all.map((c) => c.teacherId))]
    .map((id) => teacherInfo(db, id)!)
    .sort((a, b) => a.name.localeCompare(b.name));

  const q = query.trim().toLowerCase();
  const priceTest = priceRanges.find((r) => r.value === price)!.test;
  const results = all
    .filter((c) => {
      const teacherName = teacherInfo(db, c.teacherId)?.name ?? "";
      return (
        (!q || [c.title, c.subject, c.level, teacherName].some((s) => s.toLowerCase().includes(q))) &&
        (!level || c.level === level) &&
        (!subject || c.subject === subject) &&
        (!teacher || c.teacherId === teacher) &&
        priceTest(coursePrice(c))
      );
    })
    .sort((a, b) => {
      switch (sort) {
        case "rating":
          return courseRating(b).average - courseRating(a).average;
        case "newest":
          return b.createdAt.localeCompare(a.createdAt);
        case "price-asc":
          return coursePrice(a) - coursePrice(b);
        case "price-desc":
          return coursePrice(b) - coursePrice(a);
        default:
          return courseStudentCount(db, b.id) - courseStudentCount(db, a.id);
      }
    });

  const hasFilters = q || level || subject || teacher || price;
  const clear = () => {
    setQuery("");
    setLevel("");
    setSubject("");
    setTeacher("");
    setPrice("");
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
          onChange={setQuery}
          placeholder="Search by course, subject, teacher or level"
        />
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <FilterSelect
            label="Level"
            value={level}
            onChange={setLevel}
            options={[{ value: "", label: "All levels" }, ...LEVELS.map((l) => ({ value: l, label: l }))]}
          />
          <FilterSelect
            label="Subject"
            value={subject}
            onChange={setSubject}
            options={[{ value: "", label: "All subjects" }, ...subjects.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            label="Teacher"
            value={teacher}
            onChange={setTeacher}
            options={[{ value: "", label: "All teachers" }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]}
          />
          <FilterSelect
            label="Price"
            value={price}
            onChange={setPrice}
            options={priceRanges.map(({ value, label }) => ({ value, label }))}
          />
          <FilterSelect label="Sort by" value={sort} onChange={setSort} options={sorts} className="sm:ml-auto" />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {results.length} course{results.length === 1 ? "" : "s"} found
          </span>
          {hasFilters && (
            <button onClick={clear} className="font-semibold text-primary hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {results.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
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
