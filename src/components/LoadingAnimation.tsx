"use client";

import { Lottie } from "lottie-react";
import animationData from "../../public/loading.json";

export default function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-48 h-48 md:w-64 md:h-64">
        <Lottie src={animationData} loop autoplay className="w-full h-full" />
      </div>
    </div>
  );
}
