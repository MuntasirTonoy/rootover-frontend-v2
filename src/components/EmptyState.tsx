"use client";

import { Lottie } from "lottie-react";
import emptyAnimation from "../../public/empty.json";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export default function EmptyState({
  title = "No Courses Available",
  description = "Please check back later for upcoming courses.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-64 h-64 mb-4">
        <Lottie src={emptyAnimation} loop autoplay className="w-full h-full" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}
