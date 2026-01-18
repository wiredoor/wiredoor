import type { NavItem } from "./types";

export type ActiveMatchMode = "exact" | "prefix";

export function isPathActive(itemHref: string | undefined, activePath: string, mode: ActiveMatchMode = "prefix") {
  if (!itemHref) return false;

  const clean = (p: string) => p.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

  const target = clean(itemHref);
  const current = clean(activePath);

  if (mode === "exact") return current === target;

  if (target === "/") return current === "/";

  return current === target || current.startsWith(target + "/");
}

export function findActiveItem(items: NavItem[], activePath: string, mode: ActiveMatchMode = "prefix"): NavItem | null {
  for (const item of items) {
    if (isPathActive(item.href, activePath, mode)) return item;
    if (item.children?.length) {
      const found = findActiveItem(item.children, activePath, mode);
      if (found) return found;
    }
  }
  return null;
}
