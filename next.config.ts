import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @mozilla/readability uses conditional native requires that webpack can't
  // resolve at build time — keep it as an external Node.js package.
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
      {
        source: "/api/report",
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
