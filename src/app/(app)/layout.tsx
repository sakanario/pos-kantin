import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isSetupDone } from "@/lib/settings";
import { BottomNav } from "./bottom-nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection(); // selalu dirender saat request: status setup & login dibaca dari DB/cookie
  if (!(await isSetupDone())) redirect("/setup");
  await requireAuth();
  return (
    // Halaman dengan <main data-lebar> (mis. Laporan) melebar di desktop
    <div className="mx-auto min-h-dvh max-w-md pb-28 lg:has-[[data-lebar]]:max-w-6xl">
      {children}
      <BottomNav />
    </div>
  );
}
