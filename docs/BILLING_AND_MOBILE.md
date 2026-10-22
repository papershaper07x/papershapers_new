# Billing and mobile delivery — 10 October 2026

## Implemented scope

`/papershapers/membership` provides Study Plus, voluntary contributions and the
signed-in owner's last 20 payment records. Study Plus is a **prepaid 30-day
membership with manual renewal**, not an auto-debit subscription. The operator
sets the price; there is no hardcoded commercial price or invented paid usage.
Free practice features remain available. Contributions range from ₹100 to
₹10,000 and grant no entitlement. They are business support, not charitable or
tax-deductible donations. An adult/guardian payment acknowledgement and payment
terms are required before checkout.

Razorpay was selected for India/INR, hosted payment entry, an Orders API and
signed webhooks. Its standard gateway has no setup or annual maintenance fee;
transactions still incur processing fees and applicable tax. **Free to set up
does not mean free transactions.** Do not advertise zero transaction costs.
Automatic subscription billing was deliberately deferred to avoid mandates,
automatic debits and additional subscription fees. No payment SDK, native app
framework or new hosting service is required.

References: [Razorpay pricing](https://razorpay.com/pricing/),
[Orders API](https://razorpay.com/docs/api/orders/),
[webhook validation](https://razorpay.com/docs/webhooks/validate-test/),
[PWA installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## Deployment and activation

1. Finish Razorpay merchant onboarding/KYC and use **test keys first**. Configure
   payment auto-capture in the merchant dashboard. Uncaptured authorisations
   never grant access. The operator must confirm business eligibility, payment
   methods, commercial pricing, taxes and refund support before activation.
2. Apply `database/migrations/0007_billing.sql` with the owner credential and grant
   web runtime `SELECT, INSERT, UPDATE` on `billing_orders`; grant backend runtime
   `SELECT` on that table. Existing web access to `users` is used to serialise
   owner operations. Apply request-limit migration/grants and enable shared
   limits. Neon and existing runtime roles remain the persistence boundary.
3. Set Vercel server-only variables:

   ```dotenv
   BILLING_ENABLED=true
   BILLING_CHECKOUT_ENABLED=true
   REQUEST_LIMITS_ENABLED=true
   RAZORPAY_KEY_ID=your_test_key_id
   RAZORPAY_KEY_SECRET=your_test_key_secret
   RAZORPAY_WEBHOOK_SECRET=an_independent_random_webhook_secret
   STUDY_MEMBERSHIP_PAISE=19900
   ```

   `19900` is an **example operator price**, ₹199 inclusive of any tax the
   operator must account for. Set the final price before selling. Accepted
   membership prices are integer paise from ₹1 to ₹10,000. Never use
   `NEXT_PUBLIC_` for secrets. The checkout public key ID is intentionally sent
   to the browser. Render requires only `BILLING_ENABLED=true` and backend table
   access, not Razorpay credentials. Keep the feature flags consistent.
4. Configure an HTTPS webhook at `/api/billing/webhook`, selecting
   `payment.captured` and `refund.processed`. Configure separate test and live
   endpoints/secrets. Preserve an old webhook secret until its outstanding
   deliveries are resolved; the current implementation accepts one secret.
5. A trusted operator/CI step applies the additive billing schema and web grants
   before deployment. Never store `MIGRATION_DATABASE_URL` in Vercel. The backend
   owner migration command grants its runtime read access and startup checks
   migration `0007_billing` when billing is enabled. Deploy/migrate the backend
   before enabling web checkout. Do not copy owner credentials into runtime
   services. Set web `BILLING_CHECKOUT_ENABLED=false` to pause new sales while preserving
   existing entitlements and configured webhook reconciliation. Keep
   `BILLING_ENABLED=true` on web/backend for paid access. Gateway credential
   changes do not gate entitlement reads.
6. Rehearse the acceptance cases below with test payments before replacing test
   keys. No real charge, merchant setup, hosted migration or publication is
   performed by this code change.

## Payment and persistence contract

- Version boundary: the current same-origin web routes are `/api/billing/checkout`,
  `/verify` and `/webhook`; backend generation remains `/v1/study/generation-jobs`.
  The browser cannot provide a plan, priority, owner ID or membership price.
- Authenticated writes require matching Origin and an existing account session.
  Checkout requires shared limits to be enabled and is budgeted per account.
  Checkouts for one owner serialise on a database row lock and reuse recent
  matching unpaid provider orders. Local pending records are committed before
  provider creation; failed starts can leave harmless unpaid records.
- Checkout script loads only after a payment click. Payment entry happens in
  Razorpay. We store no payment credential, card number, UPI PIN, raw provider
  payload, study answer or personal payment-method profile.
- Browser confirmation verifies HMAC, then retrieves payment status from the
  provider. Webhooks verify the **raw body** using a separate secret and also
  retrieve canonical provider state. Amount, currency, capture, order and owner
  must match the locally stored order. The receipt UUID allows recovery if the
  process stopped between creating the provider order and saving its mapping.
- Conditional updates and owner/order row locks make duplicate confirmation
  idempotent. A grant lasts 30 days from first server confirmation. Unusual
  overlapping membership purchases extend the expiry rather than discarding
  paid time. Any refund conservatively revokes that order, including partial
  refunds; a late captured event cannot resurrect a refunded grant. No
  automatic refund action is implemented: approved refunds are made in the
  merchant dashboard and reconciled by webhook.
- The indexed `billing_orders` table is owner scoped and cascades on account
  deletion. Before statutory retention requires otherwise, use a documented
  accounting export/anonymisation process rather than silently retaining child
  study data. It currently stores paid/pending/refunded, not a full tax invoice,
  settlement ledger, dispute workflow or accounting system.
- Queue priority is resolved by the backend from database grants, never from
  request JSON. Active paid memberships precede recent free jobs. Jobs waiting
  at least ten minutes take precedence in age order. Running work is not
  preempted; AI latency, source validation, provider limits and free-host cold
  starts still apply. The same quality checks and generation limits apply to
  everyone. Priority does not introduce additional provider concurrency/cost.
- Monitor failed webhook deliveries and reconcile against the merchant
  dashboard after outages. Replay failed events after restoring storage/provider
  access. Database backups and a restore drill remain required; there is no
  new hosted scheduler or automatic reconciliation job in this release.

## Mobile architecture and remaining native work

The application is an installable **progressive web app (PWA)**, accessible
through `/papershapers/mobile`. It has a manifest, standalone display, locally
generated 192/512px icons, Apple metadata, Android installation prompt where
supported, iPhone Safari instructions and a generic offline fallback. It starts
at the private study desk, redirects through existing authentication, and keeps
both portal URLs available. Mobile answer drafts retain the existing device-only
semantics; they do not become cross-device drafts.

The service worker registers on the install page, caches only `/offline.html`
and forwards navigation to the network. It does not cache APIs, private HTML,
payment history, OAuth results, answers or checkout. Offline generation, payment,
authentication and private paper access are deliberately unavailable. Assets
and normal network pages continue to use the existing browser/HTTP cache rules.
HTTPS is required outside localhost. Installation behavior varies by browser;
real Android/iOS install, OAuth and payment handoff must be rehearsed before
launch. Desktop viewport testing is not a substitute for device tests.

This release now includes a **signed Android APK** for direct distribution
through `/download/android` after the operator deploys this change. The
lightweight launcher opens the current site through a browser Custom Tab, so
routine web/backend changes require no APK update. Build/signing and manual
upgrade details: `../mobile/android/README.md`. There is no IPA or app-store listing. A Play Store TWA would
require signing, verified Digital Asset Links, a store account and review of
digital-goods billing requirements. An iOS native release would require a signed
native shell or native client, store membership, device testing, and store
billing/privacy review. These introduce cost and distribution constraints, so
the free deployment requirement makes the PWA and directly distributed
Android browser-powered launcher the supported release paths.
Avoid wrapping web checkout in a store app without verifying the store rules.

## Acceptance and operational checks

- Build, frontend suite, lint and backend suite; phone/tablet/desktop page review.
- Test checkout, abandoned checkout, pending authorisation, wrong amount,
  mismatched owner, invalid signature and disabled configuration.
- Repeat the callback and webhook concurrently: one payment must grant one
  period. Replay a capture after refund: no renewed access. Verify contribution
  capture never changes queue priority. Expire a grant and observe free priority.
- Kill the web process after remote order creation: provider receipt recovery
  must map the paid order when webhook retries. Test temporary database/provider
  failures and webhook retries, then match local history to merchant records.
- Verify an older free job precedes new paid work; refunds/expiry must remove
  priority. Test the enabled PostgreSQL backend role can read the grant index.
- Install on Android and iPhone, sign in, return from payment/OAuth, lose network,
  reload, and sign out. The cache must contain only the generic offline page.
- Automated provider tests use a stateful adapter and fake provider responses;
  they do not claim a real payment, hosted PostgreSQL migration, KYC approval or
  physical device verification. Activation remains blocked on these live checks.

## Operator handoff

The operator elected to deploy the prepared APK/download route themselves; no hosted APK URL is claimed verified by the local build. See `PAYMENT_ACTIVATION.md` for the category-specific KYC submission, test/live setup and sales-pause control. No registered NGO status or tax receipt eligibility is inferred from an unfunded project.

## Plan discovery and generation allowance

Free and Study Plus are visible on the umbrella landing, Study landing, Study primary navigation, dashboard and planner. `lib/study-plans.ts` defines Free 3 / Plus 6 generation requests per fixed 600-second window. The authenticated Next.js generation endpoint resolves active paid membership from PostgreSQL before using the existing atomic request counter. Both tiers share the counter scope across upgrades; unsuccessful requests count. Enforcement requires `REQUEST_LIMITS_ENABLED=true`. Public copy reflects disabled limits and checkout; no unlimited-use or guaranteed-speed claim. The root README contains the current route inventory and end-to-end product flow. Contributions remain separate from membership.
