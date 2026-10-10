import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { brand } from "@/config/brand";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: `${brand.name} | Premium Notes Marketplace`,
  description: brand.tagline,
  verification: {
    google: "1PRAqy7h75iWJxlRQTuntewyJTLVsKVSkOj0v-aVUa8",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} min-h-screen bg-slate-50 font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
