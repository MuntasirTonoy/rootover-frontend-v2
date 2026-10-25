// Visual identity per educational level, shared by course thumbnails and the
// landing page's level tiles so they always match
import { Atom, BookOpen, Briefcase, Code2, FlaskConical, GraduationCap, type LucideIcon } from "lucide-react";
import type { Level } from "./types";

export const levelMeta: Record<Level, { fullName: string; bg: string; gradient: string; icon: LucideIcon }> = {
  SSC: { fullName: "Secondary School Certificate", bg: "bg-emerald-600", gradient: "from-emerald-500 to-emerald-700", icon: Atom },
  HSC: { fullName: "Higher Secondary Certificate", bg: "bg-sky-600", gradient: "from-sky-500 to-sky-700", icon: FlaskConical },
  BSc: { fullName: "Bachelor of Science", bg: "bg-indigo-600", gradient: "from-indigo-500 to-indigo-700", icon: GraduationCap },
  BBA: { fullName: "Business Administration", bg: "bg-amber-600", gradient: "from-amber-500 to-amber-700", icon: Briefcase },
  BA: { fullName: "Bachelor of Arts", bg: "bg-rose-600", gradient: "from-rose-500 to-rose-700", icon: BookOpen },
  Others: { fullName: "Skills, languages & more", bg: "bg-zinc-700", gradient: "from-zinc-600 to-zinc-800", icon: Code2 },
};
