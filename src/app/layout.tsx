import type { Metadata, Viewport } from "next";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import { dataTheme } from "@/lib/tema";
import { getTema } from "@/lib/tema-server";
import "./globals.css";

const heading = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kantin",
  description: "Pencatatan profit Beng Beng & Kopi Susu Gula Aren",
  appleWebApp: { capable: true, title: "Kantin", statusBarStyle: "default" },
};

const WARNA_BAR = { light: "#ffdf4f", dark: "#121433" };

export async function generateViewport(): Promise<Viewport> {
  const t = dataTheme(await getTema());
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
  const tema = await getTema();
  return (
    <html
      lang="id"
      data-theme={dataTheme(tema)}
      className={`${heading.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
