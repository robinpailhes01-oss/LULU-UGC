/**
 * Nom du produit (ATELIER_NAME) dans la typographie de la marque : le dernier mot en italique
 * châtaigne (« June atelier », « Atelier »).
 */
export function BrandName({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const last = words.pop() ?? name;
  return (
    <>
      {words.length ? `${words.join(" ")} ` : null}
      <span className="italic text-chestnut">{last}</span>
    </>
  );
}
