import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kantin: Beng Beng & Kopi",
    short_name: "Kantin",
    description: "Pencatatan profit Beng Beng & Kopi Susu Gula Aren",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f2",
    theme_color: "#92400e",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
