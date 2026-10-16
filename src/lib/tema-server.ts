import { cookies } from "next/headers";
import { COOKIE_TEMA, isTema, type Tema } from "./tema";

export async function getTema(): Promise<Tema> {
  const v = (await cookies()).get(COOKIE_TEMA)?.value;
  return isTema(v) ? v : "hp";
}
