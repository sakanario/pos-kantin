import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isLoggedIn } from "@/lib/auth";
import { isSetupDone } from "@/lib/settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  await connection();
  if (!(await isSetupDone())) redirect("/setup");
  if (await isLoggedIn()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        {/* logo Kopi Ksatria di ubin krem, jadi tetap terlihat di semua gaya & tema */}
        <Image
          src="/icons/logo.png"
          alt="Logo Kopi Ksatria"
          width={112}
          height={112}
          priority
          className="mx-auto mb-3 rounded-[var(--r-lg)] shadow-pop"
        />
        <h1 className="font-display text-2xl font-extrabold">Kantin</h1>
        <p className="text-muted">Masukkan PIN</p>
      </div>
      <LoginForm />
    </main>
  );
}
