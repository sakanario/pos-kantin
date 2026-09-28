import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return row?.value;
}

export async function setSetting(key: string, value: string) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function isSetupDone(): Promise<boolean> {
  return (await getSetting("setup_done")) === "1";
}

export async function getIsiPerDus(): Promise<number> {
  return Number((await getSetting("isi_per_dus")) ?? 17);
}
