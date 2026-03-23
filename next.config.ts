import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom and readability use conditional native requires that webpack can't
  // resolve at build time — keep them as external Node.js packages.
  serverExternalPackages: ["@mozilla/readability"],
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/api/questions",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
