"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Ikon garis 24×24 (tebal 2.5, ujung membulat), digambar ulang dari docs/design-system BottomNav. */
const ikon = {
  beranda: (
    <>
      <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M9 3v3M12 3v3" />
    </>
  ),
  catat: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h7M9 16h5" />
    </>
  ),
  tutup: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  laporan: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-5M12 16V7M17 16v-8" />
    </>
  ),
  lainnya: <path d="M4 7h16M4 12h16M4 17h16" />,
};

const items: { href: string; label: string; icon: keyof typeof ikon; juga?: string[] }[] = [
  { href: "/", label: "Beranda", icon: "beranda" },
  { href: "/catat", label: "Catat", icon: "catat" },
  { href: "/tutup-buku", label: "Tutup Buku", icon: "tutup" },
  { href: "/laporan", label: "Laporan", icon: "laporan" },
  { href: "/lainnya", label: "Lainnya", icon: "lainnya", juga: ["/setelan"] },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <ul className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-full border-[length:var(--stroke)] border-outline bg-card-raised p-1.5 shadow-pop poster:rounded-[var(--r-lg)] poster:bg-card poster:shadow-pop-lg latte:bg-accent latte:shadow-pop-lg">
        {items.map((it) => {
          const cocok = (h: string) => path === h || path.startsWith(`${h}/`);
          const active = it.href === "/" ? path === "/" : [it.href, ...(it.juga ?? [])].some(cocok);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-[var(--r-ctl)] py-1.5 text-[11px] font-bold poster:font-display poster:text-[13px] poster:font-semibold ${active ? "bg-accent text-accent-fg poster:bg-sun poster:text-on-sun latte:bg-card latte:text-fg" : "text-muted latte:text-accent-fg/80"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-[22px] fill-none stroke-current"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ikon[it.icon]}
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
