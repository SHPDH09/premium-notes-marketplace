import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { brand } from "@/config/brand";

export const runtime = "nodejs";
export const alt = `${brand.name} logo`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoPath = path.join(process.cwd(), "public/brand/techlaunchpad-logo.png");
  const logoData = await readFile(logoPath);
  const base64 = logoData.toString("base64");
  const src = `data:image/png;base64,${base64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0ea5e9 100%)",
          padding: 48,
        }}
      >
        <img
          src={src}
          alt={brand.name}
          width={900}
          height={280}
          style={{ objectFit: "contain" }}
        />
        <p
          style={{
            marginTop: 32,
            fontSize: 36,
            color: "white",
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {brand.name}
        </p>
        <p style={{ marginTop: 8, fontSize: 22, color: "#e2e8f0" }}>{brand.tagline}</p>
      </div>
    ),
    { ...size }
  );
}
