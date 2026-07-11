import { Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer border-t border-line bg-limestone py-12">
      <div className="mx-auto flex max-w-container flex-col items-start gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-7">
        <div>
          <p className="font-display text-xl text-espresso">
            Divine<span className="text-chestnut">.</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            Studio de contenu tourisme — Occitanie, Montpellier &amp; littoral.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-espresso"
          >
            <Instagram className="h-4 w-4" aria-hidden="true" />
            Instagram
          </a>
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Divine
          </p>
        </div>
      </div>
    </footer>
  );
}
