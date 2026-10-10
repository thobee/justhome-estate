# Account troubleshooting

The public account page is `dashboard.html`. It requires a signed-in Firebase user.

Firebase Authentication and the Firestore profile are separate operations. A successful signup creates an account even if a profile write is denied. Do not register again: use the dashboard link or sign in with that account.

## If a dashboard section reports database access denied

1. Open Firebase Console and select `estatejs-7c477`.
2. Check Authentication > Users to confirm the account exists.
3. Check Firestore > Rules for the collections used by the refreshed application.
4. Permit signed-in users to read their own `users/{uid}` profile and update only their permitted fields, including `savedProperties`. Role changes must remain trusted-only.
5. Permit `viewingRequests` reads only where `userId` equals the signed-in UID. The client query already filters by this field. Creation must also require that UID and validate the submitted fields; only trusted operators may confirm requests.
6. Ensure public `properties` reads match your listing publication policy.
7. Test signup, saving a home, and a viewing request with a test account. Never publish allow-all rules to solve a permission error.

The legacy application used a separate `bookings` collection. The refreshed dashboard reads both collections so existing accounts keep their activity while rules and data migrate to `viewingRequests`. New viewing requests prefer `viewingRequests` and fall back to `bookings` only when the current deployment denies the new collection.

The application now reports independent section failures instead of hiding the entire dashboard. Missing user profiles can be created while saving a home, subject to Firestore rules. Existing roles and saved-home records are not overwritten.

No Firebase rules are changed or deployed by these source changes. Deployed rules must be reviewed in the owner's Firebase environment.
