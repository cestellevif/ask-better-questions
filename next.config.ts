import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @mozilla/readability uses conditional native requires that webpack can't
  // resolve at build time — keep it as an external Node.js package.
  serverExternalPackages: ["@mozilla/readability"],
  reactCompiler: true,
};

export default nextConfig;
