# TrondheimDC Forms

TrondheimDCs eget grensesnitt for skjemaer i Nextcloud Forms: tilbakemeldinger,
påmeldinger og undersøkelser, i TDC-drakt, for alle eller bare for innloggede.
Skjemaene lages og leses av i Nextcloud som før; denne siden er bare stedet
folk fyller dem ut.

## Tech stack

- **Framework:** Next.js (App Router, static export via `output: "export"`)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS, design tokens from [trondheimdc.no](https://github.com/TrondheimDC/trondheimdc.no), as in forening
- **i18n:** Client-side i18next (Norwegian / English), Norwegian default
- **Package manager:** pnpm

**Requirements:** Node.js 24 (pinned in `mise.toml`).

## Getting started

```bash
mise install
mise run install
mise run dev   # http://localhost:3000
```

Without Mise: `pnpm install && pnpm dev`.

**Tasks:** `mise run install` | `mise run dev` | `mise run build` | `mise run check` (lint, typecheck, test) | `mise run start`

`pnpm dev` starts `next dev` behind a small stand-in for the production nginx (`scripts/dev.mjs`); open http://localhost:3000/eksempel, a built-in sample form that works without Nextcloud (submitting it is simulated). `/` is a 404 on purpose.

Against a real Nextcloud: copy `.env.example` to `.env.local` (git-ignored) and fill it in. Logging in locally needs an OAuth client registered for `http://localhost:3000/auth/callback` ([docs/deploy.md](./docs/deploy.md)); its secret goes in `.env.local`, never in a committed file.

Submitting from dev sends real answers to that form.

## Sharing a form

Make the form in Nextcloud Forms as usual. Then the easy way: open https://forms.trondheimdc.no/admin, log in with Nextcloud, find the form and press Enter. The link to share is on your clipboard.

By hand, it is `https://forms.trondheimdc.no/s/<hash>`, with the hash from the form's Nextcloud link:

- **For anyone:** in the form, **Share** → **Share link**. The link ends in `/apps/forms/s/<hash>`.
- **Only for people with a TrondheimDC Nextcloud account:** share it with users or groups (or "all logged-in users"), and take the hash from the form's own address, `/apps/forms/<hash>`. Visitors are asked to log in with Nextcloud first.

Nothing to deploy, and edits to the questions show up right away. People who are logged in answer as themselves, also on public forms, unless the form is set to anonymous.

For a short, permanent address (QR codes, slides), add the form to `forms.config.json` and push:

```json
{ "slug": "tdc-2026", "shareHash": "<hash>", "title": "Tilbakemelding på TDC 2026" }
```

See [AGENTS.md](./AGENTS.md) for how it works and [docs/deploy.md](./docs/deploy.md) for deploying.
