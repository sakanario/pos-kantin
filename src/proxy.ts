import { NextResponse, type NextRequest } from "next/server";

/** Halaman publik tanpa login: katalog pembeli `/pesan` dan turunannya (bukan `/pesanan`). */
function publik(pathname: string) {
  return pathname === "/pesan" || pathname.startsWith("/pesan/");
}

// Cek optimistis: hanya memastikan cookie sesi ada. Validasi sebenarnya di requireAuth().
export function proxy(request: NextRequest) {
  if (!publik(request.nextUrl.pathname) && !request.cookies.has("sesi")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|setup|_next|favicon.ico|icon|apple-icon|manifest.webmanifest).*)"],
};
