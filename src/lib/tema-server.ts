import { cookies } from "next/headers";
import { COOKIE_GAYA, COOKIE_TEMA, isGaya, isTema, type Gaya, type Tema } from "./tema";

export async function getTema(): Promise<Tema> {
  const v = (await cookies()).get(COOKIE_TEMA)?.value;
  return isTema(v) ? v : "hp";
}

export async function getGaya(): Promise<Gaya> {
  const v = (await cookies()).get(COOKIE_GAYA)?.value;
  return isGaya(v) ? v : "pop";
}
