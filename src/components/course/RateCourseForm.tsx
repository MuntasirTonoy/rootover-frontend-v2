"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Review } from "@/lib/types";
import { btn, field } from "@/lib/ui";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// Star rating (1-5) + optional comment for a course the student bought. The API
// keeps one review per student, so sending again updates it.
export default function RateCourseForm({
  courseId,
  myReview,
  onSaved,
}: {
  courseId: string;
  myReview?: Review;
  onSaved: (review: Review) => void;
}) {
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const shown = hover || rating;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!rating) return setError("Choose a rating from 1 to 5 stars.");
    setSaving(true);
    try {
      const saved = await api<Review>(`/learn/${courseId}/review`, { method: "PUT", body: { rating, comment } });
      setError("");
      toast.success(myReview ? "Your review was updated" : "Thanks for rating this course!");
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.fields ?? {})[0] ?? err.message) : errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
              onClick={() => {
                setRating(i);
                setError("");
              }}
              onMouseEnter={() => setHover(i)}
              className="p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              <Star size={28} className={i <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
            </button>
          ))}
        </div>
        <span className="text-sm font-semibold text-muted-foreground">{shown ? LABELS[shown] : "Tap a star to rate"}</span>
      </div>
      <textarea
        rows={3}
        maxLength={1000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell other students what you liked (optional)"
        aria-label="Review (optional)"
        className={field}
      />
      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={saving} className={btn.primary}>
        {saving && <Loader2 size={16} className="animate-spin" />}
        {myReview ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
