export function PageHeader({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <header className="px-4 pb-3 pt-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </header>
  );
}
