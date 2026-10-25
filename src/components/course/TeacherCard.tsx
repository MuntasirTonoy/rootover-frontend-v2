"use client";

import Link from "next/link";
import { BadgeCheck, BookOpen, Star, Users } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import type { TeacherPublic } from "@/lib/api-types";

// Teacher summary; stats cover their published courses (computed by the API)
export default function TeacherCard({ teacher, compact }: { teacher: TeacherPublic; compact?: boolean }) {
  const { stats } = teacher;

  return (
    <Link
      href={`/teachers/${teacher.id}`}
      className="group flex h-full flex-col rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Avatar name={teacher.name} src={teacher.avatar} size="w-14 h-14" />
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-bold text-foreground group-hover:text-primary transition-colors">
            <span className="truncate">{teacher.name}</span>
            <BadgeCheck size={16} className="text-primary shrink-0" aria-label="Verified teacher" />
          </p>
          <p className="text-sm text-muted-foreground truncate">{teacher.headline}</p>
          {!compact && teacher.institution && (
            <p className="text-xs text-muted-foreground truncate">{teacher.institution}</p>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs text-muted-foreground">
        <span className="flex flex-col items-center gap-0.5">
          <BookOpen size={14} />
          <b className="text-foreground">{stats.courses}</b> courses
        </span>
        <span className="flex flex-col items-center gap-0.5">
          <Users size={14} />
          <b className="text-foreground">{stats.students}</b> students
        </span>
        <span className="flex flex-col items-center gap-0.5">
          <Star size={14} />
          <b className="text-foreground">{stats.rating ? stats.rating.toFixed(1) : "–"}</b> rating
        </span>
      </div>
    </Link>
  );
}
