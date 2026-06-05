/** First letter of the restaurant name for avatar placeholders. */
export function getRestaurantInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const match = trimmed.match(/[A-Za-z0-9\u00C0-\u024F]/);
  return match ? match[0].toUpperCase() : "?";
}
