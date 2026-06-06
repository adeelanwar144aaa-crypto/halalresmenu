import { parseJsonField } from "@/lib/parse-json-field";
import type { MenuData, MenuDataCategory, MenuDataItem } from "@/types/restaurant";

export type MenuHighlightEntry = MenuDataItem & {
  categoryName: string;
  key: string;
};

export function formatMenuPrice(price: number | null | undefined): string | null {
  if (price == null || !Number.isFinite(price)) return null;
  return `£${price.toFixed(2)}`;
}

export function parseMenuData(raw: unknown): MenuData | null {
  const parsed = parseJsonField<Record<string, unknown>>(raw);
  if (!parsed) return null;

  const obj = parsed;
  const categoriesRaw = Array.isArray(obj.categories) ? obj.categories : [];
  const categories: MenuDataCategory[] = categoriesRaw
    .map((cat) => {
      if (!cat || typeof cat !== "object") return null;
      const c = cat as Record<string, unknown>;
      const name = String(c.name || "").trim();
      if (!name) return null;

      const itemsRaw = Array.isArray(c.items) ? c.items : [];
      const items: MenuDataItem[] = itemsRaw
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const it = item as Record<string, unknown>;
          const itemName = String(it.name || "").trim();
          if (!itemName) return null;

          const price =
            typeof it.price === "number" && Number.isFinite(it.price)
              ? Math.round(it.price * 100) / 100
              : null;

          return {
            name: itemName,
            description: it.description
              ? String(it.description).trim()
              : null,
            price,
          };
        })
        .filter((item): item is MenuDataItem => item != null);

      if (items.length === 0) return null;
      return { name, items };
    })
    .filter((cat): cat is MenuDataCategory => cat != null);

  if (categories.length === 0) return null;

  const source =
    typeof obj.source === "string" && obj.source.trim()
      ? obj.source.trim()
      : "ai_generated";

  return { source, categories };
}

export function hasMenuData(menuData: MenuData | null): boolean {
  return Boolean(menuData?.categories?.some((c) => c.items.length > 0));
}

export function getMenuHighlights(
  menuData: MenuData | null,
  perCategory = 3
): MenuHighlightEntry[] {
  if (!menuData) return [];

  const highlights: MenuHighlightEntry[] = [];
  menuData.categories.forEach((category, catIndex) => {
    category.items.slice(0, perCategory).forEach((item, itemIndex) => {
      highlights.push({
        ...item,
        categoryName: category.name,
        key: `${catIndex}-${itemIndex}-${item.name}`,
      });
    });
  });

  return highlights;
}

export function getMenuSchemaSample(
  menuData: MenuData | null,
  limit = 6
): MenuDataItem[] {
  const highlights = getMenuHighlights(menuData, 3);
  return highlights.slice(0, limit).map(({ name, description, price }) => ({
    name,
    description,
    price,
  }));
}
