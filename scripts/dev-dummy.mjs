// Jalankan `next dev` dengan dummy.db (bukan local.db).
// Matikan dulu `npm run dev` yang biasa: Next.js tidak mengizinkan dua dev server di folder yang sama.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync("dummy.db")) {
  console.error("dummy.db belum ada. Jalankan dulu: npm run seed:dummy");
  process.exit(1);
}

spawn("npx next dev", {
  env: { ...process.env, DATABASE_URL: "file:dummy.db", DATABASE_AUTH_TOKEN: "" },
  stdio: "inherit",
  shell: true,
}).on("exit", (code) => process.exit(code ?? 0));
