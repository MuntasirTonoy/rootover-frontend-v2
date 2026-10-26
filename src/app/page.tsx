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
import type { CourseSummary, Facets, Paginated, TeacherPublic } from "@/lib/api-types";
import { levelMeta } from "@/lib/levels";
import { banner } from "@/lib/site-config";
import { useApi } from "@/lib/use-api";
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
  center = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  // Centred text; any action goes underneath instead of on the right
  center?: boolean;
}) {
  return (
    <div
      className={`mb-8 md:mb-10 flex flex-col gap-3 ${
        center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
      }`}
    >
      <div className={`max-w-2xl ${center ? "mx-auto" : ""}`}>
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
  const [query, setQuery] = useState("");

  // The 8 courses with the most students (ranked by the API from the database)
  const featured = useApi<Paginated<CourseSummary>>("/courses?sort=popular&limit=8").data?.data ?? [];
  const levelCounts = useApi<Facets>("/courses/facets").data?.levels;
  // Ranked by the API: most students, then best rating
  const teachers = (useApi<TeacherPublic[]>("/teachers").data ?? []).slice(0, 4);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/courses?q=${encodeURIComponent(query.trim())}` : "/courses");
  };

  return (
    <div className="flex flex-col">
      {/* Hero: fills the screen below the 80px sticky navbar */}
      <section className="bg-background pt-10 pb-14 md:pt-16 md:pb-20 overflow-hidden flex min-h-[calc(100svh-5rem)] items-center">
        <div className="container-custom w-full">
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
            center
            eyebrow="Find your path"
            title="Explore by level"
            subtitle="Find the right courses for your next learning milestone."
          />

          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-10">
            {LEVELS.map((level, i) => {
              const meta = levelMeta[level];
              const count =
                levelCounts?.find((l) => l.level === level)?.count ?? 0;

              return (
                <motion.div
                  key={level}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex justify-center"
                >
                  <Link
                    href={`/courses?level=${level}`}
                    className="group flex w-full max-w-[190px] flex-col items-center text-center focus-visible:outline-none"
                  >
                    {/* Circular level card */}
                    <div
                      className={`relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-full bg-linear-to-br ${meta.gradient} text-white shadow-md ring-4 ring-white/60 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:ring-primary/20 group-focus-visible:ring-4 group-focus-visible:ring-primary`}
                    >
                      {/* Decorative glow */}
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-transform duration-500 group-hover:scale-150" />

                      {/* Background icon */}
                      <meta.icon
                        aria-hidden="true"
                        strokeWidth={1}
                        className="absolute -bottom-3 -right-3 h-24 w-24 text-white/10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 sm:h-28 sm:w-28"
                      />

                      {/* Main icon */}
                      <div className="relative mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14">
                        <meta.icon size={26} strokeWidth={1.7} />
                      </div>

                      <p className="relative text-2xl font-black tracking-tight sm:text-3xl">
                        {level}
                      </p>

                      <p className="relative mt-1 max-w-[85%] text-[10px] font-medium leading-tight text-white/85 sm:text-xs">
                        {meta.fullName}
                      </p>

                      <span className="relative mt-2 rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm sm:text-xs">
                        {count} {count === 1 ? "course" : "courses"}
                      </span>
                    </div>

                    {/* Label below circle */}
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-foreground transition-colors group-hover:text-primary sm:text-sm">
                      Explore
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <ViewAllLink href="/courses">Browse all courses</ViewAllLink>
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
            center
            eyebrow="Learn from the best"
            title="Popular teachers"
            subtitle="Experienced educators who make every concept clear."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {teachers.map((t) => (
              <TeacherCard key={t.id} teacher={t} />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <ViewAllLink href="/teachers">Browse all teachers</ViewAllLink>
          </div>
        </div>
      </section>

      {/* Teach on Root Over: at least one full screen tall, card centred in it */}
      <section className={`${sectionY} bg-background flex min-h-svh items-center`}>
        <div className="container-custom w-full">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 md:p-14 lg:p-16 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">For teachers</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-4">
                Teach on Root Over
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-8">
                Publish complete subject courses, set your own price and coupons, and withdraw your earnings to bKash.
              </p>
              <Link
                href="/teacher/apply"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary-hover transition-colors"
              >
                Apply as a teacher <ArrowRight size={18} />
              </Link>
            </div>
            <ul className="space-y-6 md:space-y-8">
              {teachSteps.map((step) => (
                <li key={step.title} className="flex gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <step.icon size={22} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground md:text-lg">{step.title}</p>
                    <p className="text-sm md:text-base text-muted-foreground">{step.text}</p>
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
