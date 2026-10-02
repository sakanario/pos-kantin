import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, DM_Sans, Montserrat, Plus_Jakarta_Sans, Rubik } from "next/font/google";
import { dataTheme, WARNA_BAR } from "@/lib/tema";
import { getGaya, getTema } from "@/lib/tema-server";
import "./globals.css";

// Kantin Pop
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
// Kantin Poster
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  preload: false, // hanya diunduh bila gaya Poster dipakai
});
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
// Kantin Latte
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  preload: false, // hanya diunduh bila gaya Latte dipakai
});
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Kantin",
  description: "Pencatatan profit Beng Beng & Kopi Susu Gula Aren",
  appleWebApp: { capable: true, title: "Kantin", statusBarStyle: "default" },
};

export async function generateViewport(): Promise<Viewport> {
  const [gaya, tema] = await Promise.all([getGaya(), getTema()]);
  const warna = WARNA_BAR[gaya];
  const t = dataTheme(tema);
  return {
    themeColor: t
      ? warna[t]
      : [
          { media: "(prefers-color-scheme: light)", color: warna.light },
          { media: "(prefers-color-scheme: dark)", color: warna.dark },
        ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [gaya, tema] = await Promise.all([getGaya(), getTema()]);
  const fonts = [montserrat, jakarta, barlowCondensed, barlow, rubik, dmSans].map((f) => f.variable).join(" ");
  return (
    <html
      lang="id"
      data-theme={dataTheme(tema)}
      data-gaya={gaya === "pop" ? undefined : gaya}
      className={`${fonts} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
