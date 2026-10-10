# Setup and deployment

## Local preview

Install Node.js 20 or later, then run `npm run dev`. The built-in static server uses port 4173 and binds to the local computer. Set `PORT` to another unused port if necessary. Serve over HTTP; opening the HTML with `file://` prevents JavaScript modules from working reliably.

The application opens at `/index.html`. Sample apartments are marked in the catalog and remain visible while published Firebase listings load. All accounts, saved homes, messages, and published-property viewing requests use Firebase. Sample apartments cannot be booked.

## Live data

The refreshed public pages use `js/platform.js` as their shared Firebase entry point. The checked-in web config identifies the original Firebase project. Before deploying your own instance, replace it with your Firebase project's public web configuration. Legacy agent/admin modules still have independent configuration; align those separately before enabling them.

In the Firebase console:

1. Enable Email/Password in Authentication.
2. Add your actual deployment hostname to authorized domains.
3. Create Firestore and deploy reviewed access rules. Do not use allow-all rules.
4. Publish property documents with title, location, type, numeric price, bedrooms, bathrooms, image or images, and availability status. The public UI currently interprets price as monthly NGN; do not mix sale or annual prices in this collection without adding an explicit price-period field and updating the UI.
5. Verify signup, saved homes, viewing requests, and contact messages using a test account in your own project.

### Collections used by the refreshed public UI

| Collection        | Fields / access intent                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `properties`      | Public readable listings. Trusted agents/admins write; clients must not grant themselves those roles.                                                        |
| `users/{uid}`     | Account name, email, role, savedProperties, recentViews. Users read/update their own permitted fields; role changes are trusted-only.                        |
| `viewingRequests` | userId, propertyId, propertyTitle, name, email, date, message, status, createdAt. Users create/read their own requests; only trusted operators confirm them. |
| `messages`        | userId, name, email, message, status, createdAt. Signed-in users create messages; operators manage replies through a separately verified workflow.           |

Authorization must be enforced in Firestore rules. UI redirects are convenience, not access control. No rules are automatically deployed by this repository.

## Hosting

The refreshed public experience is buildless. Upload the thirteen public HTML pages (including `neighborhoods.html`, `renting-guide.html`, and `faq.html`), `style/platform.css`, `js/catalog-core.js`, `js/platform.js`, `js/platform-app.js`, `images/`, `robots.txt`, and `sitemap.xml` to your static host. A `firebase.json` public-file allowlist is supplied for Firebase Hosting. Run checks before deployment and authorize deployment separately.

Canonical URLs, social previews, and sitemap entries use `https://justhome-estate.vercel.app/`. Update those references together if the domain changes. Once deployed, submit the sitemap in your search engine webmaster console. These files help discovery but do not guarantee rankings. Private-page robots exclusions are not a substitute for access control.

Do not deploy `create-admin-account.html`, `fix-admin-account.html`, `admin/signup.html`, `js/setupAdmin.js`, old payment scripts, or experimental pages until a backend access-control review is complete. The supplied hosting configuration omits them. Keep account/dashboard pages out of search indexing.

Viewing requests are not payments or confirmed reservations. Real payment processing must use server-side initialization, verification, signed webhooks, and idempotent fulfillment; browser callbacks cannot establish payment success.
