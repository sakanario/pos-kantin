import { NextResponse, type NextRequest } from "next/server";

// Cek optimistis: hanya memastikan cookie sesi ada. Validasi sebenarnya di requireAuth().
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sesi")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|setup|_next|favicon.ico|icon|apple-icon|manifest.webmanifest).*)"],
};
