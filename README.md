# JustHome

Real estate site for finding, renting and listing homes in Nigeria. Static HTML pages, vanilla JavaScript, Firebase (Auth + Firestore) and Tailwind CSS.

## Develop

```bash
npm install
npm run build:site   # inline shared partials + compile Tailwind to style/main.css
npm run dev     # preview on http://localhost:4173
```

- `partials/` holds the shared `<head>`, header and footer. Edit them, then run `npm run build:site`; it rewrites the blocks between `<!-- head:start -->`/`<!-- header:start -->`/`<!-- footer:start -->` markers in the public pages.
- `style/input.css` + `tailwind.config.js` define the design tokens (one brand blue, warm neutrals, Plus Jakarta Sans). `style/main.css` is the compiled output and is committed, so the site can be uploaded as-is (Vercel or cPanel).
- `js/ui.js` handles the header, menus, scroll reveals (skipped under reduced motion), toasts and inline form validation (`<form data-validate>`).
- Images live in `images/opt/` as compressed WebP at several widths for `srcset`.

The admin and agent pages (`admin/`, `agent-dashboard.html`, `add-property.html`, `manage-properties.html`) are unchanged and still load Tailwind from the CDN.
