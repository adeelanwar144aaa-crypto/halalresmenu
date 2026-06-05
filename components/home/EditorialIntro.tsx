export function EditorialIntro() {
  return (
    <section className="border-t border-zinc-200/80 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-halal-700">
          The guide
        </p>
        <h2 className="mt-4 font-serif text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
          Halal dining in the UK, written for people who care about more than a
          menu
        </h2>

        <div className="mt-10 space-y-6">
          <p className="text-lg leading-[1.8] text-zinc-700 first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-5xl first-letter:font-bold first-letter:text-halal-800">
            Britain&apos;s halal restaurant landscape is one of the richest in
            Europe — shaped by generations of Muslim families, certifiers, and
            chefs who built neighbourhoods where food, faith, and community meet
            at the same table. From late-night grills in East London to
            Bradford&apos;s curry houses and Glasgow&apos;s Turkish cafés, every
            city tells a different story.
          </p>
          <p className="leading-[1.8] text-zinc-600">
            HalalResMenu is not a bare list of addresses. Each venue gets a full
            editorial page: certification context, prayer-aware nearby mosques,
            opening hours, and menus where we have them — the kind of detail you
            would expect from a travel guide, not a phone book.
          </p>
          <p className="leading-[1.8] text-zinc-600">
            We verify what we can from public sources and encourage you to call
            ahead and confirm halal status before you visit. Standards vary by
            certifier, cuisine, and how a kitchen is run on a busy Friday night —
            our role is to help you make an informed choice with clarity and
            respect for how diverse Muslim diners actually eat out in the UK.
          </p>
        </div>
      </div>
    </section>
  );
}
