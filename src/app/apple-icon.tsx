import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { brand } from "@/config/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const logoPath = path.join(process.cwd(), "public/brand/techlaunchpad-logo.png");
  const logoData = await readFile(logoPath);
  const src = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0ea5e9 100%)",
          padding: 20,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={brand.name} width={140} height={70} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size }
  );
}
