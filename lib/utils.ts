/** Concatène des classes en ignorant les valeurs vides (équivalent minimal du `cn` de shadcn). */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
