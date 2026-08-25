import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import "./scrollcraft.css";
import "./june.css";

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
  title: "June — On crée votre contenu, vous n'avez plus qu'à poster",
  description:
    "Reels, vidéos UGC et photos clé en main pour les lieux de tourisme en Occitanie : hôtels, restaurants, logements insolites, expériences. On vient, on filme, on monte — vous n'avez plus qu'à poster.",
  openGraph: {
    title: "June — Studio de contenu tourisme",
    description:
      "Du contenu prêt à poster pour les lieux de tourisme : reels, vidéos UGC et photos qui reflètent l'expérience de votre lieu. Sans abonnement, en Occitanie.",
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
