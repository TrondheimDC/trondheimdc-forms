# TrondheimDC Forms

TrondheimDCs eget grensesnitt for skjemaer i Nextcloud Forms: tilbakemeldinger,
påmeldinger og undersøkelser, i TDC-drakt. Foreløpig bare skjemaer som er åpne for alle.
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

`pnpm dev` is `next dev`, with nginx's Nextcloud forwarding as rewrites in `next.config.mjs`. Open http://localhost:3000/eksempel, a built-in sample form that works without Nextcloud (submitting it is simulated). `/` is a 404 on purpose.

Dev uses the real Nextcloud from `forms.config.json`. To point it at another one, copy `.env.example` to `.env.local` (git-ignored) and set it there.

Submitting from dev sends real answers to that form.

## Sharing a form

Make the form in Nextcloud Forms as usual, then **Share** → **Share link**. The link ends in `/apps/forms/s/<hash>`; the one to share is `https://forms.trondheimdc.no/s/<hash>`.

Nothing to deploy, and edits to the questions show up right away.

Forms only for people with a TrondheimDC Nextcloud account need "Log in with Nextcloud", which is parked for now. Share those with the Nextcloud link as before. A `/s/<hash>` link to one shows a button that opens it in Nextcloud.

For a short, permanent address (QR codes, slides), add the form to `forms.config.json` and push:

```json
{ "slug": "tdc-2026", "shareHash": "<hash>", "title": "Tilbakemelding på TDC 2026" }
```

Name it `{event}-{year}` for the event's main form (the feedback), and `{event}-{year}-{purpose}` for the rest (`tdc-2026-committee`): lowercase `a-z`, `0-9` and hyphens, no æøå, short enough to type off a slide. The year keeps old QR codes pointing at old forms. Once a link is out, never rename or reuse it: leave a finished form in the list and it shows as closed. `pnpm test` stops a slug that breaks these rules or takes one of the site's own paths (`s`, `admin`, `fonts` and so on).

That also gives the link its own preview in Slack, LinkedIn and so on: the title on TDC's image, at `/{slug}/og.png`. Add `"description"` for a line of text under it, and `"lang": "en"` for a form written in English, so the page around it starts in English too. A `/s/<hash>` link always gets the general preview: the form only loads in the browser, and link previews don't run JavaScript. So for a link that will be shared widely, add a slug.

See [AGENTS.md](./AGENTS.md) for how it works and [docs/deploy.md](./docs/deploy.md) for deploying.
