import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isSetupDone } from "@/lib/settings";
import { BottomNav } from "./bottom-nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!(await isSetupDone())) redirect("/setup");
  await requireAuth();
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
