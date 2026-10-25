// Shared Tailwind class presets so buttons, fields and cards look the same everywhere
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50",
  ghost:
    "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-surface transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  small:
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
};

export const field =
  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60";

export const fieldError = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

export const label = "block text-sm font-semibold text-foreground mb-1.5";

export const card = "bg-card border border-border rounded-lg";
