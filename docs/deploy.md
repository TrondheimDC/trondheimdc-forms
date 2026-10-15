# Deploy: forms.trondheimdc.no

A static site (Next.js `output: "export"`), deployed like forening, utlegg and regnskap. There is no app server and no database.

nginx does a little more here than for forening: it forwards a few Nextcloud paths, so the browser only talks to this site. Edits to forms in Nextcloud never need a deploy.

**"Log in with Nextcloud" is parked.** Only public forms work on this site for now; a members-only form gets a button to answer it in Nextcloud. The login code is still there, switched off. Turning it on takes all of:

1. `"login": true` in `forms.config.json`, with the real `oauthClientId`.
2. The OAuth client in Nextcloud (step 2).
3. The `include /etc/nginx/snippets/forms-login.conf;` line uncommented in the site config, then `setup-server.sh` again (step 3), which installs the login locations and asks for the client secret.

Read the security notes in AGENTS.md first: Nextcloud has no PKCE, so nginx adds the client secret to the token request, and its tokens have no scopes.

```text
push to main
    → GitHub Actions: lint, typecheck, test, next build
    → rsync out/ → /var/www/sites/forms.trondheimdc.no/public
```

| Part | Value |
|---|---|
| Public URL | https://forms.trondheimdc.no |
| Static files | `/var/www/sites/forms.trondheimdc.no/public` |
| Nginx site | [nginx/forms.trondheimdc.no.conf](../nginx/forms.trondheimdc.no.conf) |
| Nginx snippet | [nginx/forms-nextcloud-proxy.conf](../nginx/forms-nextcloud-proxy.conf) → `/etc/nginx/snippets/` |
| Login locations (parked) | [nginx/forms-login.conf](../nginx/forms-login.conf) → `/etc/nginx/snippets/` |
| OAuth client secret (parked) | `/etc/nginx/forms-oauth-client.conf` (server only, root, 600) |
| Nginx logs | `/var/www/sites/forms.trondheimdc.no/logs/` |
| Workflows | `.github/workflows/cd.yml` (push to `main`), `pr.yml` (pull requests to `main`) |

Changes to the files under `nginx/` aren't deployed by CD. Copy them over and reload nginx, the same way as the first time (step 3).

## 1. GitHub (one-time)

| Type | Name | Value |
|---|---|---|
| Secret | `SSH_HOST` / `SSH_USER` / `SSH_PRIVATE_KEY` | Same as forening, utlegg and regnskap (org secrets) |

`SSH_USER` must be able to write to the static files directory.

## 2. Nextcloud (one-time, as admin)

**OAuth client (only with the login on).** Go to Administration settings → Security → OAuth 2.0 clients and add:

| Name | Redirection URI |
|---|---|
| `TrondheimDC Forms` | `https://forms.trondheimdc.no/auth/callback` |

Put the **Client Identifier** in `forms.config.json` (`oauthClientId`, not secret) and push. Keep the **Secret** for step 3. Nextcloud shows it only once.

**Optional: skip the account picker.** By default Nextcloud shows a "Connect to your account" page before its login and grant pages. To go straight to login/grant:

```bash
occ config:app:set oauth2 skipAuthPickerApplications --type=array --value='["TrondheimDC Forms"]'
```

**Optional: real visitor IPs.** Every request reaches Nextcloud from this web server, so Nextcloud's brute-force protection counts all visitors together. Adding this server to `trusted_proxies` in Nextcloud's `config.php` makes Nextcloud read the visitor's IP from `X-Forwarded-For`, which nginx sets.

## 3. Server (one-time)

The Nextcloud host, `hub.trondheimdc.no`, is in `nginx/forms-nextcloud-proxy.conf` (two lines) and must match `nextcloudUrl` in `forms.config.json`.

```bash
# From your machine
scp docs/setup-server.sh nginx/* <server>:
# On the server, with the user behind the SSH_USER secret
sudo bash setup-server.sh <deploy-user>
```

[setup-server.sh](./setup-server.sh) installs the snippet, then asks for the OAuth client id and secret. It writes them, base64-encoded, to the root-only `/etc/nginx/forms-oauth-client.conf`. It also creates the site and log directories and gets the certificate from certbot (webroot, port 80 only until the certificate exists). Finally it installs the full nginx config and reloads. It is safe to run again. Leave the id and secret empty to keep the existing file.

## 4. First deploy

Push `main`, or run **Actions → CD - Build & Deploy** by hand (`workflow_dispatch`).

## 5. Verify after deploy

```bash
curl -sI https://forms.trondheimdc.no | head -1                                  # 404 (on purpose)
curl -sI https://forms.trondheimdc.no/og.png | grep -i ^content-type             # image/png
curl -sI https://forms.trondheimdc.no/eksempel/og.png | grep -i ^content-type    # image/png
curl -sI https://forms.trondheimdc.no/s/<hash> | head -1                         # 200 (s.html)
curl -sI https://forms.trondheimdc.no/finnes-ikke | head -1                      # 404
curl -s -H 'OCS-APIRequest: true' https://forms.trondheimdc.no/apps/forms/s/<public hash> | grep -c initial-state-forms-form   # 1
curl -sI https://forms.trondheimdc.no/apps/forms/s/<public hash> | head -1       # 403 (no OCS-APIRequest)
curl -sI -H 'OCS-APIRequest: true' https://forms.trondheimdc.no/ocs/v2.php/cloud/user | head -1   # 404 (login parked; 401 with it on)
curl -sI http://forms.trondheimdc.no | grep -i ^location                         # → https://
```

Then, in a browser:

1. Open `/s/<public hash>`, answer it, and check that the answer arrives in Nextcloud.
2. Open `/s/<form hash>` of a logged-in-only form. With the login parked, you should get a button that opens it in Nextcloud. The rest of this list is only for when the login is on.

   With the login on, you should get **Log in with Nextcloud**, then Nextcloud's grant page, then the form again. This is also the check that the client secret is right (a wrong one sends you back with "Logging in didn't work"). Answer it, and check that the answer is under your name.
3. Login on: open `/admin`, find a form and press Enter: the clipboard should hold its link.
4. Login on: click **Log out**. The session "TrondheimDC Forms" should be gone from Personal settings → Security → Devices & sessions.

Keep the dev tools console open while you do this. A Content-Security-Policy violation means something new loads from another origin, and the policy in the nginx config needs to allow it.

## Local preview of the build

```bash
pnpm build
pnpm start                  # serves out/ on http://localhost:3000, without nginx: no Nextcloud paths
```

`pnpm dev` is the realistic local setup: `next.config.mjs` forwards the Nextcloud paths public forms need, like nginx does.
