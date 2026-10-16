import { urlFoto } from "@/lib/foto";

/** Ikon garis pengganti foto: cangkir (racikan) atau bungkus camilan (barang jadi). */
export function IkonMenu({ jenis, size = 34 }: { jenis: "racikan" | "barang_jadi"; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {jenis === "racikan" ? (
        <>
          <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
          <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
          <path d="M9 3v3M12 3v3" />
        </>
      ) : (
        <>
          <rect x="3" y="7" width="18" height="10" rx="2" />
          <path d="M3 10l-1.5-1M3 14l-1.5 1M21 10l1.5-1M21 14l1.5 1M8 7v10M16 7v10" />
        </>
      )}
    </svg>
  );
}

/** Foto menu persegi (object-cover); tanpa foto → ubin krem + ikon garis. */
export function FotoMenu({
  id,
  jenis,
  fotoVersi,
  size = 84,
  className = "",
}: {
  id: number;
  jenis: "racikan" | "barang_jadi";
  fotoVersi: number | null;
  size?: number;
  className?: string;
}) {
  const kotak = `shrink-0 overflow-hidden rounded-[var(--r-md)] ${className}`;
  if (fotoVersi === null) {
    return (
      <div className={`${kotak} flex items-center justify-center bg-card-raised text-accent-2`} style={{ width: size, height: size }}>
        <IkonMenu jenis={jenis} size={Math.round(size * 0.4)} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- foto dari route sendiri, sudah dikecilkan & di-cache
    <img
      src={urlFoto(id, fotoVersi)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={`${kotak} bg-card-raised object-cover`}
      style={{ width: size, height: size }}
    />
  );
}
