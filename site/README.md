# site/ — postbase.so static site

A self-contained static preview of the postbase.so marketing site, built on the locked
brand system (see [../docs/DESIGN.md](../docs/DESIGN.md)). Deployable as-is; will migrate
into the Next.js app at Phase 0.

- `index.html` — landing page (light + dark, responsive).
- `assets/` — logo + favicon set (mirrors the root [`../assets/`](../assets)).

## Still to add

- `/privacy` and `/terms` pages — content is drafted in
  [../legal/](../legal) (Markdown); render those as HTML pages so the footer links resolve.
  A live **Privacy URL** is a hard prerequisite for the X / LinkedIn / Meta app submissions.

## Deploy (today, before the app exists)

This folder can go straight to Vercel/Netlify as a static site so postbase.so is live and
the gate applications have a real homepage + privacy URL to point at. Point the platform's
output/root at `site/`.
