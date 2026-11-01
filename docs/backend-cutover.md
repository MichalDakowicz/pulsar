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

Operational evidence and backup details are kept privately. This document does
not claim release or device acceptance before those checks finish.
