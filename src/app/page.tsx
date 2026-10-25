"use client";

import { useState, type FormEvent, type ReactNode } from "react";
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
import { levelMeta } from "@/lib/levels";
import { banner } from "@/lib/site-config";
import { catalogCourses, courseRating, courseStudentCount, teacherInfo } from "@/lib/selectors";
import { LEVELS } from "@/lib/types";

// One vertical rhythm for every landing section
const sectionY = "py-14 md:py-20";

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

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 md:mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-2 text-sm sm:text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ViewAllLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group flex items-center gap-1 text-sm font-bold text-primary shrink-0">
      {children}
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

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
      <section className="bg-background pt-10 pb-14 md:pt-16 md:pb-20 overflow-hidden">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12">
            <div className="flex-1 w-full max-w-2xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1] mb-5"
                dangerouslySetInnerHTML={{ __html: banner.title }}
              />
              <p className="text-base sm:text-lg text-muted-foreground mb-7 max-w-xl leading-relaxed">
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

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Popular:</span>
                {["Physics", "Chemistry", "Calculus", "Accounting"].map((term) => (
                  <Link
                    key={term}
                    href={`/courses?q=${term}`}
                    className="rounded-full border border-border px-3 py-0.5 text-foreground hover:border-primary hover:text-primary transition-colors"
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
              className="flex-1 relative w-full aspect-[4/3] max-w-md lg:max-w-xl"
            >
              <Lottie src={heroAnimation} loop autoplay />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Levels */}
      <section className={`${sectionY} bg-surface`}>
        <div className="container-custom">
          <SectionHeading
            eyebrow="Find your path"
            title="Browse by level"
            subtitle="From SSC to university, pick your level and find complete subject courses."
            action={<ViewAllLink href="/courses">All courses</ViewAllLink>}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {LEVELS.map((level, i) => {
              const meta = levelMeta[level];
              const count = courses.filter((c) => c.level === level).length;
              return (
                <motion.div
                  key={level}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Link
                    href={`/courses?level=${level}`}
                    className={`group relative flex h-full min-h-36 sm:min-h-44 flex-col justify-between overflow-hidden rounded-2xl bg-linear-to-br ${meta.gradient} p-4 sm:p-5 text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40`}
                  >
                    {/* Large faded icon in the corner, grows on hover */}
                    <meta.icon
                      aria-hidden
                      strokeWidth={1.5}
                      className="absolute -right-5 -bottom-5 h-24 w-24 sm:h-28 sm:w-28 opacity-15 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
                    />
                    <div className="relative flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <meta.icon size={20} />
                      </span>
                      <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold backdrop-blur-sm">
                        {count} {count === 1 ? "course" : "courses"}
                      </span>
                    </div>
                    <div className="relative mt-6">
                      <p className="text-2xl sm:text-3xl font-black tracking-tight">{level}</p>
                      <p className="mt-0.5 text-[11px] sm:text-xs text-white/80 line-clamp-1">{meta.fullName}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold transition-all duration-300 sm:opacity-0 sm:-translate-x-1 group-hover:opacity-100 group-hover:translate-x-0">
                        Explore <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section id="popular-courses" className={`${sectionY} bg-background`}>
        <div className="container-custom">
          <SectionHeading
            eyebrow="Top rated"
            title="Featured courses"
            subtitle="Complete courses from verified teachers, loved by students."
            action={<ViewAllLink href="/courses">View all</ViewAllLink>}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {featured.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular teachers */}
      <section className={`${sectionY} bg-surface`}>
        <div className="container-custom">
          <SectionHeading
            eyebrow="Learn from the best"
            title="Popular teachers"
            subtitle="Experienced educators who make every concept clear."
            action={<ViewAllLink href="/teachers">All teachers</ViewAllLink>}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {teachers.map(({ info }) => info && <TeacherCard key={info.id} teacher={info} />)}
          </div>
        </div>
      </section>

      {/* Teach on Root Over */}
      <section className={`${sectionY} bg-background`}>
        <div className="container-custom">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 md:p-12 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">For teachers</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                Teach on Root Over
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">
                Publish complete subject courses, set your own price and coupons, and withdraw your earnings to bKash.
              </p>
              <Link
                href="/teacher/apply"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary-hover transition-colors"
              >
                Apply as a teacher <ArrowRight size={18} />
              </Link>
            </div>
            <ul className="space-y-5">
              {teachSteps.map((step) => (
                <li key={step.title} className="flex gap-4">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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
      <section className={`${sectionY} bg-background`}>
        <div className="container-custom">
          <div className="bg-surface rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 border border-border grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-4 md:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className={`group text-center ${stat.border} border-border/50`}>
                <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 md:mb-4 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:-translate-y-1 transition-all duration-300">
                  <stat.icon className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary mb-1.5 md:mb-2">
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
