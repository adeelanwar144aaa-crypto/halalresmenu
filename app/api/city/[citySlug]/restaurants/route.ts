import {
  CITY_PAGE_SIZE,
  fetchCityRestaurants,
} from "@/lib/city-restaurants";

export const runtime = "edge";

type RouteContext = { params: Promise<{ citySlug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { citySlug } = await context.params;
  const normalized = citySlug.toLowerCase().trim();
  if (!normalized) {
    return Response.json({ error: "Invalid city" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") ?? String(CITY_PAGE_SIZE)) || CITY_PAGE_SIZE)
  );

  try {
    const { restaurants, total } = await fetchCityRestaurants(normalized, {
      limit,
      offset,
    });

    return Response.json({
      restaurants,
      total,
      hasMore: offset + restaurants.length < total,
    });
  } catch (err) {
    console.error("city restaurants API:", err);
    return Response.json({ error: "Failed to load restaurants" }, { status: 500 });
  }
}
