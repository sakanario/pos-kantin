import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { isSetupDone } from "@/lib/settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (!(await isSetupDone())) redirect("/setup");
  if (await isLoggedIn()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mb-3 text-5xl">☕</div>
        <h1 className="text-2xl font-semibold">Kantin</h1>
        <p className="text-muted">Masukkan PIN</p>
      </div>
      <LoginForm />
    </main>
  );
}
