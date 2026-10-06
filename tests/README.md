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


# Customer payroll / rehire regression checks

Run from the repository root:

```powershell
node --test tests/payroll-regression.test.cjs tests/permission-regression.test.cjs tests/attendance-handlers.test.cjs
node tests/run-payroll-rules.cjs
node tests/run-permission-rules.cjs
node tests/run-attendance-rules.cjs
node tests/payroll-ui.test.cjs
```

The payroll suite executes the shared calculation module and actual callable handler with an in-memory transaction substitute. It checks employment gaps/overlap, same-month rehire, contract versus payable amounts, manual meal preservation, legacy ambiguity, versioning/corrections/voiding, source authorization, cross-client IDs, retries and version-bound email dispatch. No production data or mail is written.

The 27 payroll Rules scenarios call the Rules test API with mocked documents. Legacy salaries, employee mutations, new slips, versions and mail creation cannot be written directly by the browser. Validated writes use payrollCommand.

The browser suite uses esbuild and Playwright with synthetic employee and salary fixtures; Firebase imports are replaced at bundle time. It exercises the employee rehire form, two independent payslips in one month, manually adjusted pay, an interrupted save followed by retry, confirmation, previews and Excel reconciliation. Set PLAYWRIGHT_MODULE to a Playwright package path if it is not installed locally; PLAYWRIGHT_CHANNEL defaults to msedge. It uses an ephemeral localhost port and writes synthetic screenshots/exports under the OS temp directory. Production credentials are not used. Browser callable/storage are mocked; server transaction logic is covered separately, not by an actual deployed integration run.

## Original payroll layout regression

Run `node tests/payroll-layout.test.cjs` with the same Playwright environment variables. This tests the actual restored PayrollView against the pre-rehire `6f25821` component using identical synthetic data. It compares monthly/yearly header widths, positions, original tabs and expanded groups, additional desktop viewport sizes, and exercises independent periods, saved-value previews, the original formatted Excel workbook, draft edits before confirmation, readonly legacy/confirmed records, and loading failures. Screenshots and geometry JSON stay in the OS temporary directory. Firebase is mocked; no real salary or email is created. The older payroll-ui suite remains a calculation-editor fixture and employee rehire regression; PayrollLedger no longer replaces the production payroll screens.
