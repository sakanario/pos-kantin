import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// IP laptop di jaringan lokal, supaya `next dev` bisa dibuka dari HP (satu WiFi).
// Tanpa ini, JavaScript diblokir dan tombol-tombol tidak berfungsi.
const ipLokal = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  // libsql memakai binary native untuk file SQLite lokal
  serverExternalPackages: ["@libsql/client", "libsql"],
  allowedDevOrigins: ipLokal,
};

export default nextConfig;
