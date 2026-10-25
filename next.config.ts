import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Dev-only instant-navigation checks: only validate segments that export
    // `instant`. Signed-in areas render after the browser reads the mock
    // localStorage session, so implicit validation always reports their
    // pages as "dropped". Revisit once auth moves server-side.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
