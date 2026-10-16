# Deploy: forms.trondheimdc.no

A static site (Next.js `output: "export"`), deployed like forening, utlegg and regnskap. There is no app server and no database.

nginx does one thing more here than for forening, the way regnskap does for Fiken: it forwards the two Nextcloud paths a public form needs (the share page, to read the form, and the Forms API, to send an answer), so the browser only talks to this site. Edits to forms in Nextcloud never need a deploy.

**"Log in with Nextcloud" is parked.** Only public forms work on this site for now; a members-only form gets a button to answer it in Nextcloud. The login code is still there, switched off. Turning it on takes `login: true` in `forms.config.ts` with the real `oauthClientId`, the OAuth client in Nextcloud (step 2), and the login's nginx locations, with the client secret added on the token request. Those locations were in `nginx/forms-login.conf` (`git log --all -- nginx/forms-login.conf`). Read the security notes in AGENTS.md first: Nextcloud has no PKCE, and its tokens have no scopes.

```text
push to main
    → GitHub Actions: lint, typecheck, test, next build
    → rsync out/ → /var/www/sites/forms.trondheimdc.no/public
```

| Part | Value |
|---|---|
| Public URL | https://forms.trondheimdc.no |
| Static files | `/var/www/sites/forms.trondheimdc.no/public` |
| Nginx site | [nginx-forms.trondheimdc.no.conf](./nginx-forms.trondheimdc.no.conf) → `/etc/nginx/sites-available/forms.trondheimdc.no` |
| Nginx logs | `/var/www/sites/forms.trondheimdc.no/logs/` |
| Workflows | `.github/workflows/cd.yml` (push to `main`), `pr.yml` (pull requests to `main`) |

Changes to the nginx file aren't deployed by CD. Copy it over and reload nginx (step 3).

## 1. GitHub (one-time)

| Type | Name | Value |
|---|---|---|
| Secret | `SSH_HOST` / `SSH_USER` / `SSH_PRIVATE_KEY` | Same as forening, utlegg and regnskap (org secrets) |

`SSH_USER` must be able to write to the static files directory.

## 2. Nextcloud (one-time, as admin)

Nothing to set up for public forms.

**OAuth client (only with the login on).** Go to Administration settings → Security → OAuth 2.0 clients and add:

| Name | Redirection URI |
|---|---|
| `TrondheimDC Forms` | `https://forms.trondheimdc.no/auth/callback` |

Put the **Client Identifier** in `forms.config.ts` (`oauthClientId`, not secret) and push. Keep the **Secret** for the token location in nginx, on the server only. Nextcloud shows it only once.

**Optional: skip the account picker.** By default Nextcloud shows a "Connect to your account" page before its login and grant pages. To go straight to login/grant:

```bash
occ config:app:set oauth2 skipAuthPickerApplications --type=array --value='["TrondheimDC Forms"]'
```

**Visitor IPs (needed).** Every request reaches Nextcloud from this web server, so Nextcloud's brute-force protection counts all visitors as one. Each unknown share hash (a mistyped link, a bot, a members-only link, which the site tries as a share hash first) is a failed try: after about 8 in 12 hours every form load waits 25 seconds, and after 10 in 30 minutes every form load fails. The nginx file sends the visitor's address in `X-Forwarded-For`; Nextcloud only reads it from a trusted proxy, so add this server to `trusted_proxies` with `occ` (there is no setting for it in the web UI). Check what is there first, and add to it rather than replacing it:

```bash
sudo -u www-data php occ config:system:get trusted_proxies
sudo -u www-data php occ config:system:set trusted_proxies <next index> --value=<this server's address, as Nextcloud sees it>
```

## 3. Server (one-time)

The Nextcloud host, `hub.trondheimdc.no`, is in the nginx file (both Nextcloud locations) and must match `nextcloudUrl` in `forms.config.ts`.

```bash
# From your machine
scp docs/setup-server.sh docs/nginx-forms.trondheimdc.no.conf <server>:
# On the server, with the user behind the SSH_USER secret
sudo bash setup-server.sh <deploy-user>
```

[setup-server.sh](./setup-server.sh) is forening's: it creates the site and log directories, gets the certificate from certbot (webroot, port 80 only until the certificate exists), then installs the full nginx config and reloads. It is safe to run again.

Later changes to the nginx file only need copying over:

```bash
sudo cp nginx-forms.trondheimdc.no.conf /etc/nginx/sites-available/forms.trondheimdc.no
sudo nginx -t && sudo systemctl reload nginx
```

Don't run `certbot --nginx` on it: it edits the file in place. The webroot certificate renews without touching it.

## 4. First deploy

Push `main`, or run **Actions → CD - Build & Deploy** by hand (`workflow_dispatch`).

## 5. Verify after deploy

```bash
curl -sI https://forms.trondheimdc.no | head -1                                  # 404 (on purpose)
curl -sI https://forms.trondheimdc.no/og.png | grep -i ^content-type             # image/png
curl -sI https://forms.trondheimdc.no/example/og.png | grep -i ^content-type    # image/png
curl -sI https://forms.trondheimdc.no/s/<hash> | head -1                         # 200 (s.html)
curl -sI https://forms.trondheimdc.no/s/<hash>/qr | head -1                      # 200 (s/qr.html)
curl -sI https://forms.trondheimdc.no/finnes-ikke | head -1                      # 404
curl -s -H 'OCS-APIRequest: true' https://forms.trondheimdc.no/apps/forms/s/<public hash> | grep -c initial-state-forms-form   # 1
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

`pnpm dev` is the realistic local setup: `next.config.ts` forwards the Nextcloud paths public forms need, like nginx does.
