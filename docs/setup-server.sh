#!/usr/bin/env bash
# One-time (and safe to repeat) server setup for forms.trondheimdc.no. See docs/deploy.md.
#
# From your machine:
#   scp docs/setup-server.sh nginx/* <server>:
# On the server:
#   sudo bash setup-server.sh <deploy-user>      # the user behind the SSH_USER secret
set -euo pipefail

DOMAIN=forms.trondheimdc.no
SITE=/var/www/sites/$DOMAIN
DEPLOY_USER=${1:?usage: sudo bash setup-server.sh <deploy-user>}
HERE="$(dirname "$0")"
CONF="$HERE/$DOMAIN.conf"
OAUTH=/etc/nginx/forms-oauth-client.conf

for f in "$CONF" "$HERE/forms-nextcloud-proxy.conf"; do
  [ -f "$f" ] || { echo "Missing $f, copy nginx/* next to this script"; exit 1; }
done
if grep -Eq "^(proxy_pass https://|proxy_set_header Host )NEXTCLOUD_HOST" "$HERE/forms-nextcloud-proxy.conf"; then
  echo "Replace NEXTCLOUD_HOST in forms-nextcloud-proxy.conf first"; exit 1
fi

# 1. Directories: the deploy user writes the site, nginx writes the logs.
mkdir -p "$SITE/public" "$SITE/logs" /var/www/letsencrypt /etc/nginx/snippets
chown -R "$DEPLOY_USER" "$SITE/public"
chown root:adm "$SITE/logs"

# 2. The Nextcloud proxy snippet, and the OAuth client secret for /oauth/token.
install -m 644 "$HERE/forms-nextcloud-proxy.conf" /etc/nginx/snippets/forms-nextcloud-proxy.conf

read -rp "OAuth client id (empty: keep $OAUTH): " CLIENT_ID
if [ -n "$CLIENT_ID" ]; then
  read -rsp "OAuth client secret: " CLIENT_SECRET; echo
  umask 077
  printf 'proxy_set_header Authorization "Basic %s";\n' \
    "$(printf '%s:%s' "$CLIENT_ID" "$CLIENT_SECRET" | base64 -w0)" > "$OAUTH"
  chown root:root "$OAUTH"; chmod 600 "$OAUTH"
fi
[ -f "$OAUTH" ] || { echo "No $OAUTH yet: run again and give the client id and secret"; exit 1; }

# 3. Certificate. Until it exists, serve only the port 80 block so nginx can start
#    and answer the ACME challenge.
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  awk '/^server \{/ { n++ } n == 1' "$CONF" > "/etc/nginx/sites-available/$DOMAIN"
  ln -sf "/etc/nginx/sites-available/$DOMAIN" /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  certbot certonly --webroot -w /var/www/letsencrypt -d "$DOMAIN"
fi

# 4. Full config (HTTP redirect + HTTPS site, Nextcloud forwarding).
cp "$CONF" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "Done. Push main (or run the CD workflow by hand) to deploy into $SITE/public."
