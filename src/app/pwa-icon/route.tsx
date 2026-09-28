import { ImageResponse } from "next/og";
import { IconArt } from "@/components/icon-art";

export function GET(request: Request) {
  const size = new URL(request.url).searchParams.get("size") === "192" ? 192 : 512;
  return new ImageResponse(<IconArt size={size} />, { width: size, height: size });
}
