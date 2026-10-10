# Remaining work

## Before production use

- Deploy and test Firestore ownership and role rules in an owner-controlled project.
- Remove self-service admin role assignment from retained management prototypes; provision roles through a trusted backend.
- Unify legacy agent/admin Firebase configuration and verify the publishing workflow.
- Add an agent-facing queue for the new `viewingRequests` collection, confirmation states, and email delivery. Current requests are stored but are not automatically confirmed.
- Add an explicit rental period or sale-price schema before mixing different pricing models.
- Replace any payment prototype with server-side verification before accepting money.
- Establish operator policies and a reliable contact channel before presenting the project as a commercial agency.

## Scale and polish

- Move large-catalog search to indexed server-side queries and pagination.
- Add more gallery interactions and listing-image validation in management tools.
- Consolidate legacy dashboards onto the public design tokens without changing their authorization boundaries.
- Add Firebase emulator coverage for ownership, role escalation, viewing validation, and account recovery.
- Add browser regression tests and CI checks for the public application.

## Scope of this refresh

The ten public pages now use shared UI, search logic, inline auth feedback, saved homes, viewing requests, and an expanded sample apartment catalog. The legacy agent/admin interfaces are retained and explicitly treated as a follow-up area, not as verified production functionality.
