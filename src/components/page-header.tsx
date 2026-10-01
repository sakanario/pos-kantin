import Link from "next/link";

/** `back`: tautan kembali (mis. "/lainnya") untuk halaman yang dibuka dari daftar. */
export function PageHeader({ title, sub, back }: { title: string; sub?: React.ReactNode; back?: string }) {
  return (
    <header className="px-4 pb-3 pt-6">
      {back && (
        <Link href={back} className="-ml-1 mb-1 inline-block text-sm text-accent">
          ‹ Kembali
        </Link>
      )}
      <h1 className="text-xl font-semibold">{title}</h1>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </header>
  );
}
