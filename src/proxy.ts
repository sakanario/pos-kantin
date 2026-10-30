import { NextResponse, type NextRequest } from "next/server";
import { HEADER_AREA } from "@/lib/tema";

/** Halaman publik tanpa login: katalog pembeli `/pesan` dan turunannya (bukan `/pesanan`). */
function publik(pathname: string) {
  return pathname === "/pesan" || pathname.startsWith("/pesan/");
}

// Cek optimistis: hanya memastikan cookie sesi ada. Validasi sebenarnya di requireAuth().
export function proxy(request: NextRequest) {
  if (publik(request.nextUrl.pathname)) {
    // Penanda untuk root layout: halaman pembeli memakai tema pembeli sendiri (lib/tema-server.ts)
    const headers = new Headers(request.headers);
    headers.set(HEADER_AREA, "pembeli");
    return NextResponse.next({ request: { headers } });
  }
  if (!request.cookies.has("sesi")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // sw.js: service worker notifikasi (CR-005 Tahap 4), harus bisa diambil tanpa redirect.
  // api/gateway: webhook Midtrans (Tahap 3b), dipanggil server Midtrans tanpa cookie.
  matcher: ["/((?!login|setup|_next|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|api/gateway).*)"],
};
