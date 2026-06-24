/**
 * City slug → background image path (under /public).
 * Swap paths here when final photography is ready.
 */
export const CITY_IMAGES: Record<string, string> = {
  london: "/images/cities/london.jpg",
  birmingham: "/images/cities/birmingham.jpg",
  bradford: "/images/cities/bradford.jpg",
  manchester: "/images/cities/manchester.jpg",
  leicester: "/images/cities/leicester.jpg",
  luton: "/images/cities/luton.jpg",
  blackburn: "/images/cities/blackburn.jpg",
  oldham: "/images/cities/oldham.jpg",
  rochdale: "/images/cities/rochdale.jpg",
  dewsbury: "/images/cities/dewsbury.jpg",
  glasgow: "/images/cities/glasgow.jpg",
  cardiff: "/images/cities/cardiff.jpg",
  leeds: "/images/cities/leeds.jpg",
  newcastle: "/images/cities/newcastle.jpg",
  sheffield: "/images/cities/sheffield.jpg",
  liverpool: "/images/cities/liverpool.jpg",
  edinburgh: "/images/cities/edinburgh.jpg",
  bristol: "/images/cities/bristol.jpg",
  nottingham: "/images/cities/nottingham.jpg",
  oxford: "/images/cities/oxford.jpg",
  cambridge: "/images/cities/cambridge.jpg",
  brighton: "/images/cities/brighton.jpg",
  coventry: "/images/cities/coventry.jpg",
  reading: "/images/cities/reading.jpg",
  southampton: "/images/cities/southampton.jpg",
  derby: "/images/cities/derby.jpg",
  hull: "/images/cities/hull.jpg",
  preston: "/images/cities/preston.jpg",
  bolton: "/images/cities/bolton.jpg",
  wolverhampton: "/images/cities/wolverhampton.jpg",
  croydon: "/images/cities/croydon.jpg",
  hounslow: "/images/cities/hounslow.jpg",
  slough: "/images/cities/slough.jpg",
  harrow: "/images/cities/harrow.jpg",
  "milton-keynes": "/images/cities/milton-keynes.jpg",
  blackpool: "/images/cities/blackpool.jpg",
  portsmouth: "/images/cities/portsmouth.jpg",
  crawley: "/images/cities/crawley.jpg",
  huddersfield: "/images/cities/huddersfield.jpg",
  swansea: "/images/cities/swansea.jpg",
  belfast: "/images/cities/belfast.jpg",
  aberdeen: "/images/cities/aberdeen.jpg",
  dundee: "/images/cities/dundee.jpg",
  inverness: "/images/cities/inverness.jpg",
  toronto: "/images/cities/toronto.jpg",
};

export const DEFAULT_CITY_IMAGE = "/images/cities/default.svg";

export function getCityImagePath(slug: string): string {
  return CITY_IMAGES[slug.toLowerCase().trim()] ?? DEFAULT_CITY_IMAGE;
}
