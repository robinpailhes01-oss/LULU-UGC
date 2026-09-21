import type { Metadata } from "next";
import { Caveat, Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import "./scrollcraft.css";
import "./june.css";
import "./june-v1.css";
import "./june-v4.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
  weight: ["400", "500"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "June · Content Experience Studio",
  description:
    "Des lieux qui font vivre une expérience. Des contenus qui donnent envie de la vivre. J'accompagne les établissements et expériences à révéler ce que leurs clients vivent réellement chez eux, pour le transformer en contenu dans lequel leurs futurs clients peuvent se projeter. Montpellier • France • Alpe d'Huez, hiver 26/27.",
  openGraph: {
    title: "June Content Studio",
    description:
      "Des lieux qui font vivre une expérience. Des contenus qui donnent envie de la vivre. Content Experience : comprendre, révéler, vivre, raconter.",
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
    <html lang="fr" className={`${fraunces.variable} ${manrope.variable} ${caveat.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
