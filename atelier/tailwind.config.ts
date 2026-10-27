import type { Config } from "tailwindcss";

/**
 * Jetons d'Atelier : la palette chaude de June (DESIGN.md du site), resserrée pour un outil
 * de travail dense. Pas de bleu « SaaS » : les états restent dans les tons terre.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F4F0E8", // fond de l'application
        sidebar: "#EFE7DA", // colonne de navigation
        surface: "#FBF7F0", // cartes, panneaux, modales
        sunken: "#E9E1D4", // champs, zones creuses
        ink: "#241D17", // texte principal, boutons primaires
        night: "#17110D", // fonds sombres (aperçu vidéo, lightbox)
        muted: "#6B5E50", // texte secondaire
        faint: "#9A8B7A", // texte tertiaire, icônes inactives
        chestnut: "#8B5E34", // accent : sélection, focus, liens
        honey: "#C98A3C", // lumière : progression, mises en avant
        "honey-soft": "#F1DFC2",
        olive: "#5F6F45", // succès (publié, prêt)
        "olive-soft": "#E3E6D3",
        terracotta: "#A8482A", // erreur, suppression
        "terracotta-soft": "#F3DCD2",
        plum: "#6E4B5E", // programmé
        "plum-soft": "#EADDE3",
      },
      borderColor: {
        line: "rgba(36,29,23,.12)",
        "line-strong": "rgba(36,29,23,.24)",
      },
      backgroundColor: {
        select: "rgba(139,94,52,.12)",
        hover: "rgba(36,29,23,.05)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(36,29,23,.06), 0 8px 24px rgba(36,29,23,.08)",
        pop: "0 12px 40px rgba(36,29,23,.18), 0 2px 6px rgba(36,29,23,.08)",
        ring: "0 0 0 2px #8B5E34",
      },
      borderRadius: {
        card: "14px",
      },
      zIndex: {
        sidebar: "30",
        panel: "40",
        tray: "50",
        modal: "60",
        menu: "70",
        toast: "80",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-in": "fade-in 160ms ease-out",
        "rise-in": "rise-in 200ms ease-out",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
