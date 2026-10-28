import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/server/env";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz", "SOFT"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export function generateMetadata(): Metadata {
  return {
    title: { default: env.appName, template: `%s · ${env.appName}` },
    description: "Clients, médiathèque, retouche, montage et programmation des réseaux sociaux.",
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#F4F0E8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="font-sans text-[14px] leading-snug">{children}</body>
    </html>
  );
}
