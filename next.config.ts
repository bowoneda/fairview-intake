import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the project root; a stray lockfile in the user's home directory otherwise confuses root detection.
  turbopack: { root: __dirname },
  // The dev server logs every Server Function's arguments and return value by default, which printed an
  // applicant's email into the terminal. SECURITY.md: PII never reaches a log, development included.
  logging: { serverFunctions: false },
};

export default nextConfig;
