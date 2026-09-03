import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import "./scrollcraft.css";
import "./june.css";
import "./june-v1.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "June, studio de contenu & UGC. Alpe d'Huez, saison 26/27",
  description:
    "June imagine et crée la com qui donne envie de vous découvrir. UGC, Réels et Photos pour les lieux, expériences et marques. Basé à l'Alpe d'Huez pour la saison 26/27, projets partout en France.",
  openGraph: {
    title: "June, studio de contenu & UGC",
    description:
      "UGC, Réels et Photos pour les lieux, expériences et marques. Alpe d'Huez, saison 26/27.",
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
