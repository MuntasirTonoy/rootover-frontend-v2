import Link from "next/link";
import { ArrowRight, Flag } from "lucide-react";

// Overview banner shown only when video reports are waiting on this role
export default function ReportsAlert({ count, href, text }: { count: number; href: string; text: string }) {
  if (count === 0) return null;
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm hover:bg-amber-500/15 transition-colors"
    >
      <Flag size={18} className="text-amber-600 shrink-0" />
      <span className="flex-1 font-medium text-amber-900 dark:text-amber-200">
        {count} {text}
      </span>
      <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300 shrink-0">
        Review <ArrowRight size={14} />
      </span>
    </Link>
  );
}
