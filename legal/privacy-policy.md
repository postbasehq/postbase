<!--
  DRAFT TEMPLATE — NOT LEGAL ADVICE.
  Prepared as a starting point for Postbase (operated by Berkway Group Limited).
  Have a qualified UK solicitor review before publishing. Fill every [bracketed] value.
  Berkway will likely need to register with the ICO as a data controller.
-->

# Privacy Policy

**Last updated: 10 September 2026**

This Privacy Policy explains how **Berkway Group Limited** ("Berkway", "we", "us"),
trading as **Postbase**, collects, uses, and protects personal data when you use the
hosted Postbase service at **postbase.so** (the "Service").

## 1. Who we are

Berkway Group Limited is the data controller for personal data processed through the
hosted Service.

- **Company:** Berkway Group Limited, a company registered in England and Wales.
- **Company number:** [company number]
- **Registered office:** [registered office address]
- **Contact:** team@postbase.so
- **ICO registration:** [ICO registration reference]

If you run your **own self-hosted instance** of the open-source Postbase software, this
policy does **not** apply to that instance — see section 12.

## 2. What this policy covers

This policy covers the hosted cloud Service. It does not cover the third-party social
platforms you connect (e.g. X, LinkedIn, Instagram), which process your data under their
own privacy policies.

## 3. Information we collect

**You give us:**
- **Account data** — name, email address, and organisation/team details. You sign in with
  an emailed link or with Google or GitHub, so we never ask for or store a password. If
  you use Google or GitHub, we receive your name, email address and profile picture from
  that provider.
- **Connected channel data** — when you connect a social account, we receive and store
  the OAuth access/refresh tokens and basic profile identifiers for that account. **Tokens
  are encrypted at rest.**
- **Content** — the posts, captions, and media you create, schedule, or publish through
  the Service, and their scheduling metadata.
- **Payment data** — handled by our payment processor ([e.g. Stripe]). We do **not**
  store your full card number; we retain limited billing details (e.g. plan, last four
  digits, billing country) as returned by the processor.
- **Communications** — messages you send us (support, feedback).

**We collect automatically:**
- **Usage and technical data** — log data, IP address, device/browser type, and product
  interactions, used to operate, secure, and improve the Service.

## 4. How we use your data, and our legal bases (UK GDPR)

| Purpose | Legal basis |
|---|---|
| Provide the Service (publish/schedule your posts, connect channels) | Performance of a contract |
| Take payment and manage subscriptions | Performance of a contract |
| Secure the Service, prevent abuse, keep audit logs | Legitimate interests |
| Improve and develop the product | Legitimate interests |
| Send service and transactional emails | Performance of a contract |
| Send marketing emails (if any) | Consent (you can opt out any time) |
| Comply with legal obligations | Legal obligation |

## 5. Who we share it with (sub-processors)

We share personal data with vetted service providers who process it on our behalf:

- **Supabase** — database, authentication, and file/media storage.
- **Vercel** — application hosting.
- **Inngest** — scheduled job execution (running your posts at their scheduled time).
- **[Payment processor, e.g. Stripe]** — payment processing.
- **[Email provider, e.g. Resend]** — transactional and notification email.

When you instruct the Service to publish, we transmit your content and use your stored
tokens to send it to the **social platform(s) you selected** (X, LinkedIn, Instagram).
Those platforms then process it under their own terms.

We do not sell your personal data. We may disclose data if required by law or to protect
our rights, users, or the public.

## 6. International transfers

Some providers listed above process data outside the UK (including the United States).
Where they do, we rely on appropriate safeguards such as the UK International Data
Transfer Agreement / Addendum or the EU Standard Contractual Clauses.

## 7. Retention

We keep personal data for as long as your account is active and as needed to provide the
Service. When you delete a connected channel we delete its stored tokens. When you close
your account we delete or anonymise your personal data within [30–90] days, except where
we must retain records to meet legal, tax, or security obligations.

## 8. Security

- OAuth tokens are **encrypted at rest**; API keys are stored **hashed**, never in
  plaintext, and are never written to logs.
- All access is over HTTPS/TLS.
- Access to production data is restricted and scoped by organisation.

No system is perfectly secure, but we take reasonable technical and organisational
measures appropriate to the risk.

## 9. Your rights

Under UK GDPR you have the right to access, rectify, erase, restrict, or object to the
processing of your personal data, to data portability, and to withdraw consent where we
rely on it. To exercise any right, email **team@postbase.so**.

You also have the right to complain to the UK Information Commissioner's Office (ICO) at
**ico.org.uk**, though we'd appreciate the chance to resolve your concern first.

## 10. Cookies

We use only cookies that are strictly necessary to run the Service (e.g. to keep you
signed in). If we ever introduce analytics or non-essential cookies, we will ask for your
consent first.

## 11. Children

The Service is not directed to, and may not be used by, anyone under 18. We do not
knowingly collect data from children.

## 12. Self-hosted deployments

Postbase is open-source and can be self-hosted. If you run your own instance, **you** are
the data controller for that instance, you supply your own platform API keys, and Berkway
has no access to and no responsibility for the data you process there.

## 13. Changes to this policy

We may update this policy. We will post the new version here with an updated date and, for
material changes, notify you by email or in-product.

## 14. Contact

Questions about this policy or your data: **team@postbase.so**.
