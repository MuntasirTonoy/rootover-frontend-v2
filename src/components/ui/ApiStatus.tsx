"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";
import type { ApiState } from "@/lib/use-api";
import { btn } from "@/lib/ui";

// What a connected page shows before its data arrives: a spinner, or the
// error with a retry button. Render the page itself once `ready(state)` is true.
export const ready = <T,>(state: ApiState<T>): state is ApiState<T> & { data: T } => state.data !== undefined;

export default function ApiStatus<T>({ state, className = "min-h-[50vh]" }: { state: ApiState<T>; className?: string }) {
  if (!state.error)
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <LoadingAnimation />
      </div>
    );
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 text-center ${className}`}>
      <AlertCircle className="text-red-500" size={36} />
      <p className="max-w-md text-sm text-muted-foreground">{state.error.message}</p>
      <button onClick={state.reload} className={btn.secondary}>
        <RotateCcw size={14} /> Try again
      </button>
    </div>
  );
}
