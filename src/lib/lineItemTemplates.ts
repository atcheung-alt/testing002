/** Identity for a reusable line-item template. Same name, description, unit,
 *  and unit price count as one template so a service billed many times
 *  collapses into a single suggestion. */
export function lineItemTemplateKey(item: {
  name: string;
  description?: string | null;
  unit?: string | null;
  unitPrice?: number | null;
}): string {
  const norm = (value: string | null | undefined) =>
    (value || "").trim().toLowerCase().replace(/\s+/g, " ");
  return [norm(item.name), norm(item.description), norm(item.unit), String(item.unitPrice || 0)].join(
    "\u0001"
  );
}
