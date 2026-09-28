import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql memakai binary native untuk file SQLite lokal
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
