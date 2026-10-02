import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kantin: Beng Beng & Kopi",
    short_name: "Kantin",
    description: "Pencatatan profit Beng Beng & Kopi Susu Gula Aren",
    start_url: "/",
    display: "standalone",
    // krem latar logo Kopi Ksatria (layar pembuka saat aplikasi dibuka dari HP)
    background_color: "#faf6ec",
    theme_color: "#faf6ec",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // maskable: kepala diperkecil agar aman saat Android memotong ikon jadi lingkaran
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
