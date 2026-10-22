# Security, publication and operations

## 1. Establish responsibility and audience

Record the actual operator/legal identity, working support/grievance contact, staffed review schedule and escalation owner. Review applicable consumer, intermediary, data-protection, child-safety and content obligations with an appropriate local professional. Policy text and automated checks are not compliance certification.

Study serves school-age learners. Resolve guardian/school permission, provider processing and publication consent before inviting minors. Begin with an adult/teacher-controlled pilot until operating requirements are settled. Marketplace adult declarations do not verify identity or age. Do not use student work, names or answers in promotions without appropriate specific permission.

## 2. Separate access and credentials

Use different preview/production branches and keys. Keep owner/moderator credentials outside web functions. Use MFA on hosting, source, DNS, DB and payment accounts; review access and revoke former staff. Backend provider keys stay server-only. Rotate exposed credentials rather than renaming their variables.

Baseline headers prevent framing, reduce referrer leakage and disable camera/microphone while allowing same-origin geolocation. Private routes/APIs are no-store/noindex. These are not access controls; session and ownership checks remain required. A strict CSP needs tested Next nonce/hash and provider handling before enforcement, not an untested policy that breaks sign-in.

## 3. Control abuse

Enable shared limits and deployment-edge protection before promotion. Journal posts are same-origin, <=16 KB, five/account/day and pending-only. Marketplace retains its posting/review/image/reservation caps. Test malicious payloads, account farms, rapid retries, HTML injection and owner-boundary attacks. Email/account quotas do not solve distributed signup abuse. Do not add silent fingerprinting or raw-IP logs without reviewing privacy and proportionality.

## 4. Operate moderation

Nearby is a noticeboard, not a verified news agency. Classification and safety are separate. AI can be wrong and confidence is not a calibrated risk probability. Uncertain/unverified/outage cases remain pending.

Use the moderator CLI in MARKETPLACE_LAUNCH.md. Inspect full text and the private image, content rights, venue/price conditions and regulated claims. Approve images only after real inspection. Preserve operator, decision/reason and appeal evidence. Withdraw harmful content, block repeat abusers and investigate reports without automatically rewarding coordinated complaints.

Journal needs human editorial permission before publication; the runtime should not have publication UPDATE privileges. Check academic/factual claims, source rights and consent for learner identities. Record review/correction cases durably. A complete Journal reviewer/audit UI remains future work. Never execute publication SQL supplied by a user post.

## 5. Manage reservations

Hosts must monitor their inbox and confirm actual availability. One-person requests are not guaranteed tickets or time slots. Display names remain private to the host; dashboard status is the current notification surface. Email/SMS/push are absent. Respect cancellation and do not reuse attendee names for marketing. Closed notices override prior confirmation.

## 6. Implement retention and recovery

Document justified retention periods for accounts/sessions, Study content/rooms, Journal, notices/media/reviews/reports, reservations/engagement, billing, budgets, logs and backups. Do not claim automatic retention jobs already exist. Test a synthetic access/deletion request across web, backend, provider handling and backups before public signup. Billing/audit evidence may need lawful retention/redaction; get operator advice rather than deleting blindly.

Back up through an approved direct connection, encrypt/restrict the backup and rehearse restore to another branch. Record recovery targets you can actually meet; free-plan retention is not a guaranteed backup service.

## 7. Monitor and respond

Daily: queue age, moderation backlog, reports, pool/storage, image caps, provider exhaustion, 429/503 and reconciliation failures. Weekly: backup restore, published-content sampling and access review. Configure real alerts in existing host/provider tools; no 24/7 staffing is supplied by code.

For incidents: contain publication/payment paths, preserve minimal evidence, revoke exposed access, restore through reviewed rollback, issue required notifications and record root cause. Use support references; never paste private images, keys or learner answers into public issues.

## 8. Record acceptance

Require named owners, actual role/branch checks, abuse cases, review/appeal examples, deletion/restore evidence and escalation contacts. Local PGlite tests do not certify Neon concurrent locking, production RSS or real model safety.
