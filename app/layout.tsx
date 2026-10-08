import type { Metadata } from "next";
import { Caveat, Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import "./scrollcraft.css";
import "./june.css";
import "./june-v1.css";
import "./june-v4.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "June Content Studio · créatrice de contenu hôtel, hébergement et expériences",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Création de contenu photo et vidéo centrée sur l'expérience client, pour hôtels, hébergements touristiques, spas, restaurants et expériences. Vidéos immersives et photographies par June, créatrice de contenu hôtelier basée à Montpellier, à l'Alpe d'Huez l'hiver 2026/27.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "June Content Studio",
    description: "Des lieux qui font vivre une expérience. Des contenus qui donnent envie de la vivre. Création de contenu hôtel, hébergement touristique et expériences.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/hero.jpg", width: 1672, height: 941, alt: "Ludivine, June Content Studio, photographie une chambre d'hôtel avec vue" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
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
