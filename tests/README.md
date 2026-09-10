# Attendance regression checks

Run from the repository root:

```powershell
node --test tests/attendance-handlers.test.cjs
node tests/run-attendance-rules.cjs
```

The handler tests use the existing TypeScript dependency and stub Firestore writes.
The rules tests require a logged-in Firebase CLI and call the Firebase Rules test API.
All document lookups are mocked; the suite does not write production documents or deploy rules.
It covers normal clock-in/out, legacy users without `isActive`, disabled users,
manual entries, identity boundaries, and settled records.

The runner defaults to the Windows global Firebase CLI installation. For another
installation, set `FIREBASE_TOOLS_LIB` to its `firebase-tools/lib` directory.
An optional first argument selects another rules file for before/after comparisons.
The API may coerce ISO strings to timestamps, so mock string timestamps use a
non-ISO placeholder to preserve the type actually written by the client SDK.
