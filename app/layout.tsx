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
  title: "June · Studio de contenu pour les lieux qui se vivent",
  description:
    "Des lieux qui font vivre quelque chose. Des contenus qui donnent envie de le vivre. Je viens vivre votre établissement comme vos clients, et je vous rends des vidéos et des photos prêtes à publier. Hôtels, chalets, maisons d'hôtes, spas, restaurants, expériences. Montpellier • Alpe d'Huez, hiver 26/27.",
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
