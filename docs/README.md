# Postbase docs

Documentation for Postbase, built with [Mintlify](https://mintlify.com).

## Preview locally

Mintlify uses port 3000 by default — the app dev server also uses 3000, so pick
another port:

```bash
cd docs
npx mint dev --port 3333
```

Then open `http://localhost:3333`.

## Structure

- `docs.json` — site config: name, colors, logo, and the sidebar navigation.
- `*/**.mdx` — one MDX file per page, grouped by folder (using, ai, cloud, mcp,
  api, self-hosting, contributing).
- `logo/`, `favicon.svg` — brand assets.

## Deploy

Connect this repository to Mintlify (mintlify.com) and point it at the `docs`
directory. Mintlify builds and hosts it (e.g. at `docs.postbase.so`). Once live,
update the app's **Docs** nav link to that URL.
