"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { btn } from "@/lib/ui";

// Star button the admin uses to pick what the home page features (courses and
// teachers). `path` is the admin endpoint, e.g. /admin/courses/:id/featured;
// `onChange` gets the saved value.
export default function FeatureToggle({
  path,
  name,
  featured,
  onChange,
  disabled,
  disabledReason,
}: {
  path: string;
  name: string;
  featured: boolean;
  onChange: (featured: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const saved = await api<{ featured: boolean }>(path, { method: "PATCH", body: { featured: !featured } });
      onChange(saved.featured);
      toast.success(saved.featured ? `${name} is now featured on the home page` : `${name} is no longer featured`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || (disabled && !featured)}
      aria-pressed={featured}
      title={disabled && !featured ? disabledReason : featured ? "Remove from the home page" : "Feature on the home page"}
      className={`${btn.small} ${featured ? "border-amber-400/60 text-amber-600 dark:text-amber-400" : ""} disabled:cursor-not-allowed`}
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Star size={14} className={featured ? "fill-amber-400 text-amber-400" : ""} />
      )}
      {featured ? "Featured" : "Feature"}
    </button>
  );
}
