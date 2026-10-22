# Payment activation: operator checklist

Payment collection is still disabled. Building/distributing the APK does not
activate Razorpay or create any financial account. The Android launcher uses the
same hosted payment flow, so new payment UI does not require a new APK.

## What you submit, and to whom

Submit KYC **directly to Razorpay**, not into this chat or the Git repository.
Choose the legal status you actually have. An unfunded project is not by itself
a registered NGO; individual/unregistered, trust, society and Section 8 are
different onboarding categories.

For an individual/unregistered account, prepare PAN/identity and address
verification plus a settlement bank account number and IFSC. CKYC may supply
some records; extra verification can be required. A registered nonprofit needs
the relevant registration/constitution documents, entity PAN, authorised
signatory details/authority and bank details for its legal form. The dashboard
and gateway review determine the exact checklist. See
[Razorpay's current category-specific KYC requirements](https://razorpay.com/docs/payments/business-types-kyc-documents).

Confirm with the gateway that your intended membership and voluntary-support
collection is permitted for the selected account. This release does not issue
charitable/tax-deductible receipts or verify NGO status. Do not promise those
benefits without the corresponding approval. Any later charitable or foreign
donation flow needs a separately approved configuration; the current flow is
INR voluntary support and optional prepaid membership.

## Decisions needed from the operator

1. Actual legal/account category and successful merchant activation.
2. Final tax-inclusive 30-day membership price, or keep new membership sales
   paused. `STUDY_MEMBERSHIP_PAISE` is integer paise; `19900` means ₹199 and is
   only a sample, not an approved price.
3. A monitored support/refund address, genuine legal/terms/privacy/refund pages,
   and a process for duplicate charges, missing access and refund requests.
4. A settlement account and a records/retention approach appropriate to your
   operator category. The app's payment history is not an accounting/tax invoice
   system. Razorpay transaction fees and applicable taxes remain payable even
   when there is no setup/annual maintenance charge.

## Configure and prove test mode first

1. In Razorpay Dashboard, switch to **Test mode**. Generate API keys in
   **Account & Settings → API Keys** (dashboard labels may vary). Keep the key
   secret private. Configure automatic capture: authorised-but-uncaptured
   payments deliberately do not unlock membership.
2. Create a test webhook to
   `https://papershapers.in/api/billing/webhook`. Select `payment.captured` and
   `refund.processed`. Generate an independent webhook secret; it must match
   `RAZORPAY_WEBHOOK_SECRET`, not the API key secret. Configure the webhook on the
   actual deployed hostname, not localhost. For a test deployment, use its URL
   and an isolated test database so test grants never become live memberships.
3. Configure Vercel environment variables for server Functions:

   | Variable | Value/source |
   | --- | --- |
   | `DATABASE_URL` | Least-privilege web runtime PostgreSQL URL |
   | `BILLING_ENABLED` | `true` after schema/entitlement deployment |
   | `BILLING_CHECKOUT_ENABLED` | `true` to permit new sales |
   | `REQUEST_LIMITS_ENABLED` | `true` after shared limit setup |
   | `RAZORPAY_KEY_ID` | Test key ID first; live ID later |
   | `RAZORPAY_KEY_SECRET` | Matching test/live secret |
   | `RAZORPAY_WEBHOOK_SECRET` | Matching independent webhook secret |
   | `STUDY_MEMBERSHIP_PAISE` | Approved integer price |

   Flags used by prebuild (`BILLING_ENABLED`, `REQUEST_LIMITS_ENABLED`) must be
   configured before the build. Never set `MIGRATION_DATABASE_URL` in the
   Vercel project; migrations/grants use a separate trusted operator/CI step.
   Provider secrets are server-only and never `NEXT_PUBLIC_`. See
   [Razorpay API-key documentation](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/).
4. Apply the additive `0005_request_limits` and `0007_billing` migrations with the
   owner credential in a separate trusted operator/CI step, then apply reviewed
   web runtime grants. Vercel prebuild only reads schema. For the backend use:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\backend.ps1 migrate
   ```

   The configured backend runtime needs SELECT on `billing_orders`. Its owner
   migration command grants this; it requires owner credentials. Keep runtime
   `DATABASE_URL` least privileged. Apply migrations before enabling billing.
5. Deploy Render with `BILLING_ENABLED=true` and confirm it can read the new
   table. It does not need Razorpay keys. Deploy the web with checkout enabled
   only after backend priority is working. Leave free-host compatibility intact.
6. Test payment capture, membership history/expiry, voluntary contribution,
   cancellation of checkout, duplicate callback/webhook, wrong owner/signature,
   provider/database outage, and a refund followed by an old capture replay.
   Compare gateway and local records; confirm contributions grant no priority
   and old free requests are not starved. Use sandbox/test payments only.

## Switch to live mode

After merchant approval and successful test deployment, configure **live** keys
and a **live** webhook with matching secrets. Use the live database without test
grants. Recheck the production policy/support pages and final price, deploy the
settings, and have the operator perform one controlled live payment/refund
rehearsal before opening sales broadly. The APK does not need rebuilding.

Do not provide payment API secrets, database-owner URLs, bank documents or
signing keys in chat. Store them in the deployment consoles/approved secret
store. The setup information useful for collaboration is the merchant approval
status, final price, legal category and confirmation that variables were set.

## Pause and recover without revoking paid customers

- Set web `BILLING_CHECKOUT_ENABLED=false` to stop new checkouts. Keep
  `BILLING_ENABLED=true` on web/backend: current memberships retain access and
  configured verification/webhooks can still reconcile captures/refunds.
- Rotating or missing gateway secrets disables new collection but does not
  erase database membership grants. Restore working secrets promptly so pending
  payments/refunds can reconcile. This is not an automatic reconciliation service.
- Monitor failed webhook deliveries, restart/replay after outages, back up the
  database, and rehearse restoration. Refunds are approved and initiated in the
  merchant dashboard; the app handles the confirmed refund event.
- Turning backend `BILLING_ENABLED=false` disables priority for existing paying
  users too. Use it only for an intentional service shutdown with customer
  support, not as the ordinary sales-pause control.

Full storage and payment contract: [BILLING_AND_MOBILE.md](BILLING_AND_MOBILE.md).
