"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items: { href: string; label: string; icon: string; juga?: string[] }[] = [
  { href: "/", label: "Beranda", icon: "☕" },
  { href: "/catat", label: "Catat", icon: "📝" },
  { href: "/tutup-buku", label: "Tutup Buku", icon: "🔒" },
  { href: "/laporan", label: "Laporan", icon: "📊" },
  { href: "/lainnya", label: "Lainnya", icon: "☰", juga: ["/setelan"] },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => {
          const cocok = (h: string) => path === h || path.startsWith(`${h}/`);
          const active = it.href === "/" ? path === "/" : [it.href, ...(it.juga ?? [])].some(cocok);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-semibold text-accent" : "text-muted"}`}
              >
                <span className="text-lg leading-none">{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
