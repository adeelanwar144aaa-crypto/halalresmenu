/** Resize/compress remote city hero backgrounds for faster LCP. */
export function optimizeCityHeroImageSrc(src: string): string {
  if (!src.includes("images.pexels.com")) return src;
  try {
    const url = new URL(src);
    url.searchParams.set("auto", "compress");
    url.searchParams.set("cs", "tinysrgb");
    url.searchParams.set("w", "1600");
    url.searchParams.set("h", "640");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("fm", "webp");
    url.searchParams.delete("dpr");
    return url.toString();
  } catch {
    return src;
  }
}
