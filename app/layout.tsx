import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

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
  title: "Divine — Contenu prêt à publier pour les lieux qu'on a envie de visiter",
  description:
    "Reels, photos et vidéos clé en main pour restaurants, hôtels, logements insolites et lieux d'activité en Occitanie. On vient, on filme, on monte — vous n'avez plus qu'à publier.",
  openGraph: {
    title: "Divine — Studio de contenu",
    description:
      "Du contenu prêt à publier pour les lieux qu'on a envie de visiter. Reels et photos clé en main, sans abonnement, en Occitanie.",
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
