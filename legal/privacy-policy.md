<!--
  DRAFT TEMPLATE — NOT LEGAL ADVICE.
  Prepared as a starting point for Postbase (operated by Berkway Group Limited).
  Have a qualified UK solicitor review before publishing. Fill every [bracketed] value.
  Berkway will likely need to register with the ICO as a data controller.
-->

# Privacy Policy

**Last updated: 28 September 2026**

This Privacy Policy explains how **Berkway Group Limited** ("Berkway", "we", "us"),
trading as **Postbase**, collects, uses, and protects personal data when you use the
hosted Postbase service at **postbase.so** (the "Service").

## 1. Who we are

Berkway Group Limited is the data controller for personal data processed through the
hosted Service.

- **Company:** Berkway Group Limited, a company registered in England and Wales.
- **Company number:** 16591862
- **Registered office:** 3rd Floor, 86-90 Paul Street, London, EC2A 4NE
- **Contact:** team@postbase.so

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
- **Payment data** — handled by Stripe, which sells subscriptions on our behalf as
  merchant of record (Stripe Managed Payments) and uses your billing name and address
  to calculate tax. We do **not**
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
- **Resend** — delivery of account emails (sign-in links and email confirmations).
- **Vercel** — application hosting, scheduled publishing, and privacy-friendly site analytics.
- **Cloudflare (R2)** — storage for files you upload to your media library.
- **Stripe** — payment processing, and merchant of record for subscriptions (tax
  calculation, receipts, fraud prevention and billing disputes).
- **Anthropic and OpenAI** — AI models that power the Postbase agent, when you use it.
- **Higgsfield** — AI image and video generation, when you use it.
- **Google (Google Analytics)** — website analytics, only if you accept analytics cookies.

When you instruct the Service to publish, we transmit your content and use your stored
tokens to send it to the **social platform(s) you selected** (such as X, LinkedIn, Bluesky,
Mastodon, TikTok and YouTube). Those platforms then process it under their own terms.

We do not sell your personal data. We may disclose data if required by law or to protect
our rights, users, or the public.

## 5a. Google and YouTube data

If you connect a YouTube channel, Postbase uses YouTube API Services. With your permission
we access:

- **YouTube upload access** (`youtube.upload`) — to upload the videos you schedule in
  Postbase to your channel, at the time you choose, with the title, description and
  visibility you set. We don't upload anything you haven't scheduled.
- **YouTube read-only access** (`youtube.readonly`) — to show which channel is connected
  (its name and avatar), and to show the view, like and comment counts of videos
  published through Postbase in your analytics. We don't read anything else.

We store the connected channel's identifier and name, the OAuth tokens (encrypted at
rest), and the public view, like and comment counts of videos published through Postbase,
which we keep for up to 36 months to show in your analytics. Disconnecting the channel
deletes all of this. We don't sell this data, use it for advertising, or share it with anyone except as
needed to provide these features. Postbase's use and transfer of information received from
Google APIs will adhere to the
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
including the Limited Use requirements.

By connecting YouTube you also agree to the
[YouTube Terms of Service](https://www.youtube.com/t/terms), and Google's handling of your
data is covered by the [Google Privacy Policy](https://policies.google.com/privacy).

You can revoke Postbase's access at any time by disconnecting the channel in Postbase,
which deletes our stored tokens, or from your Google account's security settings at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions).

## 6. International transfers

Some providers listed above process data outside the UK (including the United States).
Where they do, we rely on appropriate safeguards such as the UK International Data
Transfer Agreement / Addendum or the EU Standard Contractual Clauses.

## 7. Retention

We keep personal data for as long as your account is active and as needed to provide the
Service. When you delete a connected channel we delete its stored tokens. When you close
your account we delete or anonymise your personal data within 90 days, except where
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

We use cookies that are strictly necessary to run the Service (for example, to keep you
signed in). These don't need your consent.

On our website (postbase.so and its sign-in page) we'd also like to use **Google Analytics**
cookies, to understand which pages are useful and how visitors find us. These are only set
if you click **Accept** on our cookie banner; if you decline or ignore it, Google Analytics
isn't loaded at all. You can change your choice at any time with the **Cookie settings**
link at the bottom of every page. We don't use advertising cookies, and Google Analytics
isn't used inside the Postbase app.

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
