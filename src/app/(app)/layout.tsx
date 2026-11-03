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
    // Desktop (lg): navigasi pindah ke sidebar kiri; isi berada dalam bingkai 6xl di tengah area kanan.
    // Halaman biasa 2xl rata kiri di dalam bingkai (judul tidak bergeser antarhalaman); halaman dengan
    // <main data-lebar> (mis. Beranda, Laporan) mengisi penuh bingkai untuk tata letak dua kolom.
    <div className="min-h-dvh lg:pl-56">
      <div className="mx-auto max-w-md pb-28 lg:max-w-6xl lg:px-4 lg:pb-12 lg:pt-4">
        <div className="lg:max-w-2xl lg:has-[[data-lebar]]:max-w-none">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
