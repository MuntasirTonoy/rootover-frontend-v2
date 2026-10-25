"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lottie } from "lottie-react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Headphones,
  PlayCircle,
  Search,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import heroAnimation from "../../public/hero-student.json";
import CourseCard from "@/components/CourseCard";
import TeacherCard from "@/components/course/TeacherCard";
import CountUp from "@/components/CountUp";
import FAQ from "@/components/FAQ";
import { useApp } from "@/context/AppStore";
import { banner } from "@/lib/site-config";
import { catalogCourses, courseRating, courseStudentCount, teacherInfo } from "@/lib/selectors";
import { LEVELS } from "@/lib/types";

const levelNames: Record<string, string> = {
  SSC: "Secondary School Certificate",
  HSC: "Higher Secondary Certificate",
  BSc: "Bachelor of Science",
  BBA: "Business Administration",
  BA: "Bachelor of Arts",
  Others: "Skills, languages & more",
};

const stats = [
  { to: 5, suffix: "000", label: "Students", icon: Users, border: "" },
  { to: 48, suffix: "00", label: "videos", icon: PlayCircle, border: "border-l" },
  { to: 99, suffix: "%", label: "Success Rate", icon: Trophy, border: "lg:border-l" },
  { to: 24, suffix: "/7", label: "Support", icon: Headphones, border: "border-l" },
];

const teachSteps = [
  { icon: BadgeCheck, title: "Get verified", text: "Submit your documents and a one-time ৳300 registration fee." },
  { icon: PlayCircle, title: "Build your course", text: "Add chapters and lessons with YouTube unlisted videos." },
  { icon: Wallet, title: "Earn 90% of each sale", text: "Root Over keeps a 10% platform commission." },
];

export default function Home() {
  const router = useRouter();
  const { db } = useApp();
  const [query, setQuery] = useState("");

  const courses = catalogCourses(db);
  const featured = [...courses]
    .sort(
      (a, b) =>
        Number(!!b.featured) - Number(!!a.featured) ||
        courseRating(b).average - courseRating(a).average,
    )
    .slice(0, 8);

  // Teachers ranked by how many students their published courses have
  const teachers = db.teachers
    .map((t) => ({
      info: teacherInfo(db, t.id),
      students: courses
        .filter((c) => c.teacherId === t.id)
        .reduce((sum, c) => sum + courseStudentCount(db, c.id), 0),
    }))
    .filter((t) => t.info?.status === "active" && t.students > 0)
    .sort((a, b) => b.students - a.students)
    .slice(0, 4);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/courses?q=${encodeURIComponent(query.trim())}` : "/courses");
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-background pt-12 pb-16 overflow-hidden">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 max-w-2xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1] mb-6"
                dangerouslySetInnerHTML={{ __html: banner.title }}
              />
              <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                {banner.subtitle}
              </p>

              <form onSubmit={handleSearch} role="search" className="flex flex-col sm:flex-row gap-2 max-w-xl">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search courses, subjects, teachers or levels"
                    aria-label="Search courses"
                    className="w-full rounded-md border border-border bg-card py-3.5 pl-10 pr-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3.5 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary-hover transition-colors"
                >
                  Search
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="text-muted-foreground">Popular:</span>
                {["Physics", "Chemistry", "Calculus", "Accounting"].map((term) => (
                  <Link
                    key={term}
                    href={`/courses?q=${term}`}
                    className="rounded-full border border-border px-3 py-0.5 text-foreground hover:border-primary hover:text-primary"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, y: [0, -16, 0] }}
              transition={{
                opacity: { duration: 1 },
                scale: { duration: 1 },
                y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              }}
              className="flex-1 relative w-full aspect-[4/3] max-w-xl"
            >
              <Lottie src={heroAnimation} loop autoplay />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Levels */}
      <section className="py-12 md:py-16 bg-surface">
        <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">Browse by level</h2>
          <p className="text-muted-foreground mb-8">Find complete subject courses for your class or programme.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {LEVELS.map((level) => (
              <Link
                key={level}
                href={`/courses?level=${level}`}
                className="group rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
              >
                <p className="text-xl font-extrabold text-foreground group-hover:text-primary">{level}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{levelNames[level]}</p>
                <p className="mt-3 text-xs font-semibold text-primary">
                  {courses.filter((c) => c.level === level).length} courses
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section id="popular-courses" className="py-12 md:py-16 bg-background">
        <div className="container-custom">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">Featured courses</h2>
              <p className="text-muted-foreground">Top-rated complete courses from verified teachers.</p>
            </div>
            <Link href="/courses" className="hidden sm:flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {featured.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular teachers */}
      <section className="py-12 md:py-16 bg-surface">
        <div className="container-custom">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">Popular teachers</h2>
              <p className="text-muted-foreground">Learn from experienced educators who make every concept clear.</p>
            </div>
            <Link href="/teachers" className="hidden sm:flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              All teachers <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teachers.map(({ info }) => info && <TeacherCard key={info.id} teacher={info} />)}
          </div>
        </div>
      </section>

      {/* Teach on Root Over */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container-custom">
          <div className="rounded-lg border border-border bg-card p-6 md:p-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">Teach on Root Over</h2>
              <p className="text-muted-foreground mb-6">
                Publish complete subject courses, set your own price and coupons, and withdraw your earnings to bKash.
              </p>
              <Link
                href="/teacher/apply"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary-hover transition-colors"
              >
                Apply as a teacher <ArrowRight size={18} />
              </Link>
            </div>
            <ul className="space-y-4">
              {teachSteps.map((step) => (
                <li key={step.title} className="flex gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <step.icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <FAQ />

      {/* Stats */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container-custom">
          <div className="bg-surface rounded-3xl p-8 md:p-12 border border-border grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className={`group text-center ${stat.border} border-border/50`}>
                <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-4 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:-translate-y-1 transition-all duration-300">
                  <stat.icon className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <h3 className="text-4xl md:text-5xl font-extrabold text-primary mb-2">
                  <CountUp to={stat.to} suffix={stat.suffix} />
                </h3>
                <p className="font-bold text-muted-foreground text-[10px] md:text-xs tracking-widest uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
