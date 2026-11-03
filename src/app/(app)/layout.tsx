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
    // Desktop (lg): navigasi pindah ke sidebar kiri. Lebar isi 2xl; halaman dengan <main data-lebar>
    // (mis. Beranda, Laporan) melebar untuk tata letak dua kolom. Rata kiri supaya judul tidak bergeser antarhalaman.
    <div className="min-h-dvh lg:pl-56">
      <div className="mx-auto max-w-md pb-28 lg:mx-0 lg:max-w-2xl lg:px-4 lg:pb-12 lg:pt-4 lg:has-[[data-lebar]]:max-w-6xl">{children}</div>
      <BottomNav />
    </div>
  );
}
