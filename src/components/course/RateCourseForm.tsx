"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { btn } from "@/lib/ui";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// 1-5 stars for a course the student bought. Each buyer rates once and it can't
// be changed (the API keeps only the course's total, not who gave what).
export default function RateCourseForm({
  courseId,
  rated,
  onRated,
}: {
  courseId: string;
  rated: boolean;
  onRated: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const shown = hover || rating;

  if (rated)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 size={16} className="text-green-600" /> You&apos;ve rated this course. Thanks for your feedback!
      </p>
    );

  const submit = async () => {
    if (!rating) return setError("Choose a rating from 1 to 5 stars.");
    setSaving(true);
    try {
      await api(`/learn/${courseId}/rating`, { method: "POST", body: { rating } });
      toast.success("Thanks for rating this course!");
      onRated();
    } catch (err) {
      // Already rated (e.g. in another tab): show it as rated
      if (err instanceof ApiError && err.status === 409) {
        toast.info(err.message);
        onRated();
        return;
      }
      setError(err instanceof ApiError ? (Object.values(err.fields ?? {})[0] ?? err.message) : errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
              disabled={saving}
              onClick={() => {
                setRating(i);
                setError("");
              }}
              onMouseEnter={() => setHover(i)}
              className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Star size={28} className={i <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
            </button>
          ))}
        </div>
        <span className="text-sm font-semibold text-muted-foreground">{shown ? LABELS[shown] : "Tap a star to rate"}</span>
      </div>
      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} disabled={saving || !rating} className={btn.primary}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          Submit rating
        </button>
        <span className="text-xs text-muted-foreground">You can rate a course only once.</span>
      </div>
    </div>
  );
}
