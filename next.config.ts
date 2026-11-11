import type { NextConfig } from "next";

// Every page in the CRM is per-user and private, so pages render on each request
// (Cache Components is left off on purpose).
const nextConfig: NextConfig = {
  poweredByHeader: false,
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
