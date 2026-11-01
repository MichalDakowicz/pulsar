# Ping backend cutover

Pulsar's cutover build uses the dedicated Ping backend and a fresh app-specific
auth-storage key. Sign in again after updating. Existing account IDs and habit
data are preserved through scoped reconciliation. No full cloud snapshot may
replace the populated Ping database.

Ping consists of Lidar, Sonar, Pulsar and Bazaar. Radar and Cellar are separate
products. Bazaar remains cloud-backed until its own cutover; sibling sign-in
blocks requests across backends. Certificates and one-time-token checks remain.

The existing Firebase Hosting destination is preserved. Android acceptance comes
before web deployment. Release acceptance requires same-account habit reads,
owner/non-owner/anonymous RLS, pact nudges, Realtime, QR and native sign-in,
plus device checks for reminders and optional health/screen integrations.

Android 1.7.1 installed in place and launched without startup errors. The user
confirmed it works after the Google/habit-history check. All 24 exported web
files match the existing Firebase site. The release includes APK/checksum assets.
Reciprocal Lidar 1.6.3 and Sonar 2.4.2 updates are installed and deployed; actual
Pulsar handoff passed in both directions with each on Android. Native reminders
and optional health/screen integrations were not separately exercised; their
code is unchanged. Operational evidence and backup details stay private.
