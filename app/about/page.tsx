import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

const canonical = `${getApexOrigin()}/about`;

export const metadata: Metadata = {
  title: "About Us | HalalResMenu",
  description:
    "Learn about HalalResMenu — the UK guide to halal restaurants, menus, and neighbourhood dining context.",
  alternates: { canonical },
};

export default function AboutPage() {
  return (
    <LegalPageShell
      title="About HalalResMenu"
      description="We help Muslim diners and curious food lovers find halal restaurants across the UK with the detail a good guide deserves."
    >
      <section>
        <h2>Who we are</h2>
        <p>
          HalalResMenu is an independent UK dining directory focused on halal
          restaurants, takeaways, and cafés. We publish venue guides with menus,
          certification context, prayer-aware neighbourhood information, and
          practical details you need before you visit.
        </p>
      </section>

      <section>
        <h2>What this site does</h2>
        <p>
          Each restaurant has its own guide page with menu highlights, halal
          information, reviews, and links to city browsing. You can search by
          city or explore featured communities where halal food culture thrives.
        </p>
      </section>

      <section>
        <h2>How our data is sourced</h2>
        <p>
          Listings combine publicly available information, partner and third-party
          datasets, and details submitted by restaurants or the community. We aim
          to keep guides useful and up to date, but practices, menus, and
          certification can change without notice.
        </p>
        <p>
          <strong>Always confirm halal status, ingredients, and allergens directly
          with the restaurant</strong> before you visit or order. HalalResMenu is a
          guide, not a certification body.
        </p>
      </section>
    </LegalPageShell>
  );
}
