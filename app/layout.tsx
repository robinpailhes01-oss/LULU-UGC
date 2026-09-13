import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import "./scrollcraft.css";
import "./june.css";
import "./june-v1.css";
import "./june-v2.css";

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
  title: "June · Faire ressentir l'expérience avant même de l'avoir vécue",
  description:
    "Content Experience : une immersion chez vous, puis sous 14 jours des reels, des photos, des stories et votre annonce dans le bon ordre, fidèles à ce que vivent vos clients. Pour les villas, maisons d'hôtes, gîtes et chalets. 490 € TTC, tout compris.",
  openGraph: {
    title: "June · Content Experience",
    description:
      "Une immersion chez vous, des reels, des photos, des stories et votre annonce dans le bon ordre. Prêts à publier sous 14 jours. 490 € TTC, tout compris.",
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
