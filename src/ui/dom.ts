/**
 * Shared DOM lookups for the thin UI modules: every element the app wires
 * must exist, so a missing control fails loudly at startup rather than
 * silently doing nothing.
 */

/** Look up a document-level element by id. */
export function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id} element`);
  return el as T;
}

/** Look up an element by id inside a container (e.g. a card built in JS). */
export function getElementIn<T extends HTMLElement>(root: ParentNode, id: string): T {
  const el = root.querySelector<HTMLElement>(`#${id}`);
  if (!el) throw new Error(`missing #${id} element`);
  return el as T;
}
