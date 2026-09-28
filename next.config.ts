import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the project root; a stray lockfile in the user's home directory otherwise confuses root detection.
  turbopack: { root: __dirname },
};

export default nextConfig;
