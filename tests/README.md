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

# Permission regression checks

Run from the repository root:

```powershell
node --test tests/permission-regression.test.cjs tests/attendance-handlers.test.cjs
node tests/run-permission-rules.cjs
```

Permission tests execute the actual handlers, service methods and profile synchronization helpers with mocked storage. They cover targeted writes, legacy list saves, color maintenance, revocation, stale events, disabled/deleted/rebound users, offline/failing submissions and role-specific tabs. The Rules tests use mocked documents only, including payroll grants/revocations, privileged role access, avatar updates and denial of self-escalation. They do not send mail, write production records or deploy rules.
