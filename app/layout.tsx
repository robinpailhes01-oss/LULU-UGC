import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import "./scrollcraft.css";
import "./june.css";
import "./june-v1.css";
import "./june-v3.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "June Content Studio · Hospitality • Tourism • Experiences",
  description:
    "Des lieux qui font vivre quelque chose. Des contenus qui donnent envie de le vivre. June est un studio de création spécialisé dans l'expérience & le storytelling : Reels, UGC, vidéos et photos. Montpellier • Alpe d'Huez, hiver 26/27.",
  openGraph: {
    title: "June Content Studio",
    description:
      "Des lieux qui font vivre quelque chose. Des contenus qui donnent envie de le vivre. Content Experience : une immersion dans votre univers pour comprendre, raconter & créer.",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
