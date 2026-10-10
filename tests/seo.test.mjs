import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (file) =>
  fs.readFileSync(new URL("../" + file, import.meta.url), "utf8");
test("discovery pages have static content and the production canonical", () => {
  for (const file of [
    "index.html",
    "neighborhoods.html",
    "renting-guide.html",
    "faq.html",
  ]) {
    const html = read(file).replace(/\s+/g, " ");
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, file);
    assert.ok(
      html.includes(
        'rel="canonical" href="https://justhome-estate.vercel.app/' +
          (file === "index.html" ? "" : file) +
          '"',
      ),
      file,
    );
    assert.ok(html.includes("<h2"), file);
    const scripts = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ];
    assert.ok(scripts.length, file);
    scripts.forEach((match) =>
      assert.equal(JSON.parse(match[1])["@context"], "https://schema.org"),
    );
  }
});
test("homepage search remains usable without client JavaScript", () => {
  const html = read("index.html").replace(/\s+/g, " ");
  assert.match(html, /id="home-search" action="properties.html" method="get"/);
  for (const name of ["q", "type", "max"])
    assert.ok(html.includes('name="' + name + '"'));
});
test("sitemap contains only public pages with existing source files", () => {
  const xml = read("sitemap.xml");
  const links = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (m) => new URL(m[1]),
  );
  assert.equal(links.length, 9);
  for (const url of links) {
    assert.equal(url.origin, "https://justhome-estate.vercel.app");
    assert.doesNotMatch(url.pathname, /signin|signup|dashboard|admin/);
    assert.ok(
      read(url.pathname === "/" ? "index.html" : url.pathname.slice(1)),
    );
  }
  assert.ok(
    read("robots.txt").includes(
      "Sitemap: https://justhome-estate.vercel.app/sitemap.xml",
    ),
  );
});
test("FAQ schema matches the visible questions and answers", () => {
  const html = read("faq.html");
  const schema = JSON.parse(
    html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
  );
  assert.equal(schema["@type"], "FAQPage");
  assert.equal(schema.mainEntity.length, 6);
  for (const entry of schema.mainEntity) {
    assert.ok(html.includes(entry.name));
    assert.ok(html.includes(entry.acceptedAnswer.text));
  }
});
