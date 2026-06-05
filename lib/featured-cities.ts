export type FeaturedCity = {
  name: string;
  slug: string;
  blurb: string;
  restaurantHint: string;
};

/** UK cities with large Muslim communities — homepage featured grid */
export const FEATURED_CITIES: FeaturedCity[] = [
  {
    name: "London",
    slug: "london",
    blurb: "Capital halal scene",
    restaurantHint: "Thousands of certified and family-run kitchens",
  },
  {
    name: "Birmingham",
    slug: "birmingham",
    blurb: "Second-city spice mile",
    restaurantHint: "Balti, Pakistani grills, and street food",
  },
  {
    name: "Bradford",
    slug: "bradford",
    blurb: "Curry capital heritage",
    restaurantHint: "Dense South Asian dining culture",
  },
  {
    name: "Manchester",
    slug: "manchester",
    blurb: "Rusholme & beyond",
    restaurantHint: "Curry Mile classics and modern cafés",
  },
  {
    name: "Leicester",
    slug: "leicester",
    blurb: "Golden Mile flavours",
    restaurantHint: "Gujarati, Punjabi, and fusion halal",
  },
  {
    name: "Luton",
    slug: "luton",
    blurb: "Bedfordshire hub",
    restaurantHint: "Kebab houses and grill restaurants",
  },
  {
    name: "Blackburn",
    slug: "blackburn",
    blurb: "Lancashire community",
    restaurantHint: "Traditional curry houses and takeaways",
  },
  {
    name: "Oldham",
    slug: "oldham",
    blurb: "Greater Manchester",
    restaurantHint: "Family balti and fast-food halal",
  },
  {
    name: "Rochdale",
    slug: "rochdale",
    blurb: "Pennine towns",
    restaurantHint: "Neighbourhood grills and desi cuisine",
  },
  {
    name: "Dewsbury",
    slug: "dewsbury",
    blurb: "West Yorkshire",
    restaurantHint: "Strong South Asian restaurant strip",
  },
  {
    name: "Glasgow",
    slug: "glasgow",
    blurb: "Scottish halal dining",
    restaurantHint: "Turkish, Pakistani, and Middle Eastern",
  },
  {
    name: "Cardiff",
    slug: "cardiff",
    blurb: "Welsh capital",
    restaurantHint: "City-centre halal cafés and grills",
  },
];
