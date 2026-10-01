import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSetupDone } from "@/lib/settings";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  await connection(); // cek status setup saat request, bukan saat build
  if (await isSetupDone()) redirect("/login");
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-display text-2xl font-extrabold">Setup awal</h1>
      <p className="mb-6 text-muted">Diisi sekali saja. Ini jadi titik awal perhitungan.</p>
      <SetupForm />
    </main>
  );
}
