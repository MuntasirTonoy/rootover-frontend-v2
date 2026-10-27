"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lottie } from "lottie-react";
import { MotionConfig, motion, useScroll, useSpring } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Headphones,
  Loader2,
  PlayCircle,
  RotateCcw,
  Search,
  Sparkles,
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
import { ready } from "@/components/ui/ApiStatus";
import { useApi, type ApiState } from "@/lib/use-api";
import { LEVELS } from "@/lib/types";
import { btn } from "@/lib/ui";

// One vertical rhythm for every landing section
const sectionY = "py-14 md:py-20";

const stats = [
  { to: 5, suffix: "000", label: "Students", icon: Users, border: "" },
  { to: 48, suffix: "00", label: "videos", icon: PlayCircle, border: "border-l" },
  { to: 99, suffix: "%", label: "Success Rate", icon: Trophy, border: "lg:border-l" },
  { to: 24, suffix: "/7", label: "Support", icon: Headphones, border: "border-l" },
];

const teachSteps = [
  { icon: BadgeCheck, title: "Get verified", text: "Submit your documents and pay a one-time registration fee to get approved." },
  { icon: PlayCircle, title: "Build your course", text: "Add chapters and lessons with YouTube unlisted videos." },
  { icon: Wallet, title: "Earn  highest from each sale", text: "Root Over keeps a lowest platform commission." },
];

const ease = [0.22, 1, 0.36, 1] as const;

// Fades its content up the first time it scrolls into view
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Light sweep across a button on hover; the button needs `group relative overflow-hidden`
function Shine() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
    />
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  center = false,
  highlight = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  // Centred text; any action goes underneath instead of on the right
  center?: boolean;
  // Eyebrow as a pill, and the heading fades up when scrolled into view
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={highlight ? { opacity: 0, y: 24 } : undefined}
      whileInView={highlight ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease }}
      className={`mb-8 md:mb-10 flex flex-col gap-3 ${
        center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
      }`}
    >
      <div className={`max-w-2xl ${center ? "mx-auto" : ""}`}>
        {eyebrow &&
          (highlight ? (
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              <Sparkles size={12} /> {eyebrow}
            </p>
          ) : (
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
          ))}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-2 text-sm sm:text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
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

// A home page list: placeholder cards while loading (the API may need up to a
// minute to wake up on a cold start), the error with a retry, or an empty note
function HomeList<T, I>({
  state,
  items,
  skeleton,
  empty,
  className,
  children,
}: {
  state: ApiState<T>;
  items: (data: T) => I[];
  skeleton: ReactNode;
  empty: string;
  className: string;
  children: (item: I) => ReactNode;
}) {
  const slow = useSlow(!ready(state) && !state.error);
  if (state.error && !ready(state))
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle className="text-red-500" size={32} />
        <p className="max-w-md text-sm text-muted-foreground">{state.error.message}</p>
        <button onClick={state.reload} className={btn.secondary}>
          <RotateCcw size={14} /> Try again
        </button>
      </div>
    );
  if (!ready(state))
    return (
      <div role="status" aria-label="Loading">
        <div className={className}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>{skeleton}</div>
          ))}
        </div>
        {slow && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Waking up the server, this can take up to a minute…
          </p>
        )}
      </div>
    );
  const list = items(state.data);
  if (list.length === 0) return <p className="py-10 text-center text-muted-foreground">{empty}</p>;
  return <div className={className}>{list.map(children)}</div>;
}

// True once `active` has stayed true for 4 seconds
function useSlow(active: boolean) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setSlow(true), 4000);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [active]);
  return active && slow;
}

const bone = "rounded bg-muted/20 animate-pulse";

function CourseSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={`aspect-video w-full ${bone} rounded-none`} />
      <div className="space-y-2 p-3 sm:p-4">
        <div className={`h-3 w-1/3 ${bone}`} />
        <div className={`h-4 w-full ${bone}`} />
        <div className={`h-4 w-2/3 ${bone}`} />
        <div className={`mt-3 h-5 w-1/2 ${bone}`} />
      </div>
    </div>
  );
}

function TeacherSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6">
      <div className={`h-20 w-20 rounded-full ${bone}`} />
      <div className={`h-4 w-2/3 ${bone}`} />
      <div className={`h-3 w-1/2 ${bone}`} />
      <div className={`h-3 w-3/4 ${bone}`} />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // The first 4 courses by students (ranked by the API from the database)
  const featured = useApi<Paginated<CourseSummary>>("/courses?sort=popular&limit=4");
  const levelCounts = useApi<Facets>("/courses/facets").data?.levels;
  // Picked by an admin (Admin → Teachers → Feature), most students first
  const teachers = useApi<TeacherPublic[]>("/teachers?featured=true");

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/courses?q=${encodeURIComponent(query.trim())}` : "/courses");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col">
        {/* Reading progress, along the bottom edge of the 80px sticky navbar */}
        <motion.div
          aria-hidden="true"
          style={{ scaleX: progress }}
          className="fixed inset-x-0 top-20 z-50 h-1 origin-left bg-linear-to-r from-primary via-sky-400 to-indigo-500"
        />

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
              highlight
              eyebrow="Find your path"
              title="Explore by level"
              subtitle="Find the right courses for your next learning milestone."
            />

            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-10">
              {LEVELS.map((level, i) => {
                const meta = levelMeta[level];
                // Undefined until the counts arrive
                const count = levelCounts && (levelCounts.find((l) => l.level === level)?.count ?? 0);

                return (
                  <motion.div
                    key={level}
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="flex justify-center"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4 + (i % 3) * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                      className="flex w-full justify-center"
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
                            {count === undefined ? "… courses" : `${count} ${count === 1 ? "course" : "courses"}`}
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
            <HomeList
              state={featured}
              items={(d) => d.data}
              skeleton={<CourseSkeleton />}
              empty="No courses published yet. Check back soon!"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
            >
              {(course) => <CourseCard key={course.id} course={course} />}
            </HomeList>
          </div>
        </section>

        {/* Featured teachers */}
        <section className={`${sectionY} bg-surface`}>
          <div className="container-custom">
            <SectionHeading
              center
              eyebrow="Learn from the best"
              title="Featured teachers"
              subtitle="Experienced educators who make every concept clear."
            />
            <HomeList
              state={teachers}
              items={(d) => d.slice(0, 4)}
              skeleton={<TeacherSkeleton />}
              empty="Featured teachers are coming soon."
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
            >
              {(t) => <TeacherCard key={t.id} teacher={t} />}
            </HomeList>
            <div className="mt-10 flex justify-center">
              <ViewAllLink href="/teachers">Browse all teachers</ViewAllLink>
            </div>
          </div>
        </section>

        {/* Teach on Root Over: at least one full screen tall, card centred in it */}
        <section className={`${sectionY} bg-background flex min-h-svh items-center`}>
          <div className="container-custom w-full">
            <Reveal>
              <div className="glow-border relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-10 md:p-14 lg:p-16 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
                <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl motion-safe:animate-blob" />
                <div className="relative">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">For teachers</p>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-4">
                    Teach on <span className="text-gradient">Root Over</span>
                  </h2>
                  <p className="text-base sm:text-lg text-muted-foreground mb-8">
                    Publish complete subject courses, set your own price and coupons, and withdraw your earnings to bKash.
                  </p>
                  <Link
                    href="/teacher/apply"
                    className="group relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-md shadow-lg shadow-primary/25 hover:bg-primary-hover transition-colors"
                  >
                    Apply as a teacher <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    <Shine />
                  </Link>
                </div>
                <ul className="relative space-y-6 md:space-y-8">
                  {teachSteps.map((step, i) => (
                    <motion.li
                      key={step.title}
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 + i * 0.15, ease }}
                      className="relative flex gap-4"
                    >
                      {/* Line joining this step to the next one */}
                      {i < teachSteps.length - 1 && (
                        <motion.span
                          aria-hidden="true"
                          initial={{ scaleY: 0 }}
                          whileInView={{ scaleY: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.5 + i * 0.15 }}
                          className="absolute left-6 md:left-7 top-14 md:top-16 -bottom-6 md:-bottom-8 w-px origin-top bg-linear-to-b from-primary/60 to-transparent"
                        />
                      )}
                      <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <step.icon size={22} />
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                          {i + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-foreground md:text-lg">{step.title}</p>
                        <p className="text-sm md:text-base text-muted-foreground">{step.text}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </Reveal>
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
    </MotionConfig>
  );
}
