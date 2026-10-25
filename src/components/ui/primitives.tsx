import type { ReactNode } from "react";
import { Search, Star, type LucideIcon } from "lucide-react";
import { initials } from "@/lib/format";
import { card, field, label as labelClass } from "@/lib/ui";

type Tone = "green" | "amber" | "red" | "blue" | "gray" | "primary" | "purple";

const tones: Record<Tone, string> = {
  green: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  red: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  gray: "bg-muted/10 text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
  purple: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const statusStyles: Record<string, [Tone, string]> = {
  draft: ["gray", "Draft"],
  pending: ["amber", "Pending"],
  approved: ["green", "Approved"],
  rejected: ["red", "Rejected"],
  suspended: ["purple", "Suspended"],
  active: ["green", "Active"],
  banned: ["red", "Banned"],
  completed: ["green", "Completed"],
  refunded: ["blue", "Refunded"],
  not_applied: ["gray", "Not Applied"],
  pending_review: ["amber", "Pending Review"],
  payment_required: ["blue", "Payment Required"],
  under_verification: ["purple", "Under Verification"],
  inactive: ["gray", "Inactive"],
  expired: ["red", "Expired"],
  // Video reports
  open: ["amber", "Open"],
  fix_submitted: ["blue", "Fix Submitted"],
  fix_rejected: ["red", "Fix Rejected"],
  resolved: ["green", "Resolved"],
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const [tone, text] = statusStyles[status] ?? ["gray", status];
  return <Badge tone={tone}>{label ?? text}</Badge>;
}

export const courseStatusLabel = (status: string) =>
  status === "pending" ? "Pending Approval" : undefined;

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
}) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-xl font-extrabold text-foreground truncate">{value}</p>
        </div>
        {Icon && (
          <div className="w-9 h-9 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Icon size={18} />
          </div>
        )}
      </div>
      {/* div, not p: hints may contain block elements */}
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${card} ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Avatar({
  name,
  src,
  size = "w-10 h-10",
  className = "",
}: {
  name: string;
  src?: string;
  size?: string;
  className?: string;
}) {
  return src ? (
    <img src={src} alt={name} className={`${size} rounded-full object-cover bg-surface ${className}`} />
  ) : (
    <div
      aria-hidden
      // `size` may carry its own text size for large avatars, e.g. "w-24 h-24 text-2xl"
      className={`${size} ${size.includes("text-") ? "" : "text-sm"} rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 ${className}`}
    >
      {initials(name)}
    </div>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  if (!count && count !== undefined) {
    return <span className="text-xs text-muted-foreground">No reviews yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="font-bold text-amber-500">{rating.toFixed(1)}</span>
      <span className="flex" aria-label={`Rated ${rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={12}
            className={i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
          />
        ))}
      </span>
      {count !== undefined && <span className="text-muted-foreground">({count})</span>}
    </span>
  );
}


export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${field} pl-9`}
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  label,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={`${field} sm:w-auto ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

// Lightweight empty state for tables and panels (the Lottie one is for full pages)
export function EmptyBlock({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Icon size={22} />
        </div>
      )}
      <p className="font-bold text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SimulatedNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
      {children ?? "Simulated payment for demo purposes only. No real money is charged."}
    </div>
  );
}
