const slugs = process.argv.slice(2);
const list = slugs.length > 0 ? slugs : ["7-spices", "anoki-derby"];

for (const slug of list) {
  const url = `https://${slug}.halalresmenu.com/`;
  const res = await fetch(url, { headers: { "User-Agent": "HalalResMenu-audit/1.0" } });
  const html = await res.text();
  const aboutIdx = html.indexOf('id="about"');
  console.log(
    slug,
    "status=" + res.status,
    "aboutSection=" + (aboutIdx >= 0),
    "photos=" + html.includes(">Photos<")
  );
}
