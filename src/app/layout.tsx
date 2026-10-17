import type { Metadata, Viewport } from "next";
import { DM_Sans, Rubik } from "next/font/google";
import { WARNA_BAR } from "@/lib/tema";
import { getDataThemeHalaman } from "@/lib/tema-server";
import "./globals.css";

const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Kantin",
  description: "Pencatatan profit Beng Beng & Kopi Susu Gula Aren",
  appleWebApp: { capable: true, title: "Kantin", statusBarStyle: "default" },
};

export async function generateViewport(): Promise<Viewport> {
  const t = await getDataThemeHalaman();
  return {
    themeColor: t
      ? WARNA_BAR[t]
      : [
          { media: "(prefers-color-scheme: light)", color: WARNA_BAR.light },
          { media: "(prefers-color-scheme: dark)", color: WARNA_BAR.dark },
        ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tema = await getDataThemeHalaman();
  const fonts = [rubik, dmSans].map((f) => f.variable).join(" ");
  return (
    <html
      lang="id"
      data-theme={tema}
      className={`${fonts} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
