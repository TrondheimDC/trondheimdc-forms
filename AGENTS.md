# TrondheimDC Forms

TrondheimDC's own front end for Nextcloud Forms: feedback, sign-ups and surveys, in TDC's look. Live at https://forms.trondheimdc.no.

## Public repo

This repo is public. Nothing secret goes in it, not even briefly: git history keeps everything.

- **Secrets** live only in the OAuth client secret's two homes: `/etc/nginx/forms-oauth-client.conf` on the server (written by `docs/setup-server.sh`) and `.env.local` for development. Both are git-ignored. Never paste a secret into docs, scripts, tests or commit messages; use placeholders (`cloud.example.org`, `AT1`).
- **Public on purpose:** `nextcloudUrl` and `oauthClientId` (`forms.config.json`; both end up in the JS bundle anyway) and the share hashes in `forms.config.json`. A public share hash lets anyone answer that form, so only list forms that are meant to be public. Form hashes of logged-in-only forms are safe to list: they still need a login.
- **No people's data:** no real names, emails or form answers in tests, fixtures or screenshots. The sample form and tests use made-up content.
- Sign-off notes and other internal notes go in `TODO.local.md`, which is git-ignored.

## Architecture

- **Static site.** Next.js App Router with `output: "export"`, served by nginx (`nginx/`, `docs/deploy.md`). No app server, and no user credentials anywhere but the visitor's own browser tab. With the login on, the one secret is the OAuth client's, in a root-only nginx include on the server: not in git, not in CI, not in the JS. Parked, there is none.
- **No front page.** `/` is a 404, on purpose: forms are reached by their own link, nothing public lists them.
- **One URL for every form: `/s/{hash}`**, the hash from either kind of Nextcloud link. First tried as a public share hash (`/apps/forms/s/{hash}`), anonymously. If Nextcloud doesn't know it as one, as the form's own hash (`/apps/forms/{hash}`), which needs a logged-in user (`src/lib/load.ts`). `/{slug}` are short names for some of them, from `forms.config.json`.
- **"Log in with Nextcloud" is parked.** `"login": false` in `forms.config.json` (`LOGIN_ENABLED` in `src/lib/config.ts`): no login button, `/admin` and `/auth/callback` show the not-found page, a members-only form shows a button to answer it in Nextcloud, and nginx doesn't include `nginx/forms-login.conf`, so the token endpoint and the logged-in-only Nextcloud paths aren't forwarded and the server needs no client secret. The code below stays, so it can be turned on again (`docs/deploy.md`). It was parked because Nextcloud's OAuth app has no PKCE and its tokens have no scopes; the better fix is likely a BFF (nginx + oauth2-proxy), not more browser code.
- **`/admin`** (parked with the login) lists the forms the logged-in user owns or was given (the Forms API has no instance-wide list, not even for admins), as a cmdk palette: Enter copies the link to share, public if the form has a public link, else the members-only one (`src/lib/admin.ts`).
- **Forms load in the browser, on every visit**, so edits in Nextcloud show up on the next page load, with no rebuild.
  - Public forms: Nextcloud has no API to read a form anonymously, so `src/lib/share-page.ts` reads it out of the share page, where Forms puts it as initial state for its own app (`FormsService::getPublicForm()`, already stripped of owner, shares and access settings).
  - Logged-in forms: the Forms app page (`/apps/forms/{hash}`) gives the id, then `GET /api/v3/forms/{id}`.
  - **Both pages are Nextcloud's bootstrap, not its documented API.** If a Forms upgrade breaks loading, start at `src/lib/share-page.ts` and `test/share-page.test.ts`.
- **Submitting** is the documented `POST /ocs/v2.php/apps/forms/api/v3/forms/{id}/submissions`: with the share hash for a public form, as the logged-in user when there is one (`src/lib/submit.ts`).
- **Logging in happens in the browser** (`src/lib/session.ts`, tested in `test/session.test.ts`), with [`oauth4webapi`](https://github.com/panva/oauth4webapi) for the OAuth protocol: no hand-written state checks or token parsing. OAuth2 against Nextcloud's own OAuth app, code back to `/auth/callback`, tokens in `sessionStorage` (gone with the tab). Nextcloud has no PKCE and wants the client secret on the token request, so that request goes to `/oauth/token` here, where nginx adds the secret.
- **Nextcloud tokens have no scopes**: they can do anything the user can, files included. So: no third-party scripts, no raw HTML from forms (Markdown only, escaped), keep the CSP tight, and only send the token to the Forms paths nginx forwards.
- **Same origin.** The browser only talks to this site; nginx forwards the Nextcloud paths. No CORS, CSP stays `connect-src 'self'`. Every forwarded path wants `OCS-APIRequest: true`, which another site can't send, and Nextcloud's HTML comes back sandboxed.
- **`pnpm dev` is `scripts/dev.mjs`**: the nginx config's Nextcloud forwarding, in front of `next dev`. A change to one needs the same change in the other.
- **Status screens.** Every dead end and end state (404, errors, closed, log in, no access, sent) is a `StatusScreen` with a drawing from `src/components/illustrations.tsx`, after checkin's error screens.
- **Question types.** `src/lib/forms.ts` lists what is rendered (`SUPPORTED_TYPES`). A form with any other type (file, grid) shows a link to the same form in Nextcloud instead of half a form.
- **Validation** mirrors `SubmissionService::validateSubmission()` in nextcloud/forms (`src/lib/answers.ts`), so Nextcloud only rejects what the browser couldn't know. Its message is shown as-is when it does.
- **i18n.** Every page is prerendered in Norwegian. English is a client-side switch (`src/i18n.ts`, `react-i18next`). The forms themselves are in whatever language they were written in, in Nextcloud.
- **Icons.** `src/app/icon.svg` is the source; `node scripts/build-icons.mjs` renders the favicon, apple icon and manifest icons. `src/app/og.png/route.tsx` is the link preview, rendered at build time.

## Copy

- Copy lives in `public/locales/{no,en}/common.json`. Change both files together.
- Norwegian bokmål first, English second. Write it in TDC's voice, short and plain. No em dashes.

## Design

- Tokens are trondheimdc.no's, as in forening, regnskap and checkin (`src/app/globals.css`). Components use the semantic tokens only.
- The theme is applied before React loads (`next-themes`). Style both themes with the `light:`/`dark:` variants, not by reading the theme in JS.
- Reserve space for anything that appears after hydration. The form itself always loads after it, so `FormLoader` holds the space with a placeholder; the header keeps a slot for the login button.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
