// Inlines partials/{head,header,footer}.html into each public page between marker comments,
// e.g. <!-- header:start --> ... <!-- header:end -->. Run: npm run build
import { readFileSync, writeFileSync } from "node:fs";

const pages = {
  "index.html": "home",
  "properties.html": "properties",
  "property-details.html": "properties",
  "about.html": "about",
  "contact.html": "contact",
  "signin.html": "",
  "signup.html": "",
  "dashboard.html": "",
};
const part = (n) => readFileSync(`partials/${n}.html`, "utf8").trim();
const indent = (s, pad) => s.split("\n").map((l) => (l ? pad + l : l)).join("\n");

for (const [file, nav] of Object.entries(pages)) {
  let html = readFileSync(file, "utf8");
  for (const name of ["head", "header", "footer"]) {
    const re = new RegExp(`([ \\t]*)<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`);
    html = html.replace(re, (_, pad) => {
      let body = part(name);
      if (nav) body = body.replaceAll(`data-nav="${nav}"`, `data-nav="${nav}" aria-current="page"`);
      return `${pad}<!-- ${name}:start -->\n${indent(body, pad)}\n${pad}<!-- ${name}:end -->`;
    });
  }
  writeFileSync(file, html);
}
console.log("partials inlined");
