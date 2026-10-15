#!/usr/bin/env bash
# One-time server setup for forms.trondheimdc.no. See docs/deploy.md.
#
# From your machine:
#   scp docs/setup-server.sh docs/nginx-forms.trondheimdc.no.conf <server>:
# On the server:
#   sudo bash setup-server.sh <deploy-user>      # the user behind the SSH_USER secret
set -euo pipefail

DOMAIN=forms.trondheimdc.no
SITE=/var/www/sites/$DOMAIN
DEPLOY_USER=${1:?usage: sudo bash setup-server.sh <deploy-user>}
CONF="$(dirname "$0")/nginx-$DOMAIN.conf"

[ -f "$CONF" ] || { echo "Missing $CONF, copy it next to this script"; exit 1; }

# 1. Directories: the deploy user writes the site, nginx writes the logs.
mkdir -p "$SITE/public" "$SITE/logs" /var/www/letsencrypt
chown -R "$DEPLOY_USER" "$SITE/public"
chown root:adm "$SITE/logs"

# 2. Certificate. Until it exists, serve only the port 80 block so nginx can start
#    and answer the ACME challenge.
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  awk '/^server \{/ { n++ } n == 1' "$CONF" > "/etc/nginx/sites-available/$DOMAIN"
  ln -sf "/etc/nginx/sites-available/$DOMAIN" /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  certbot certonly --webroot -w /var/www/letsencrypt -d "$DOMAIN"
fi

# 3. Full config (HTTP redirect + HTTPS site).
cp "$CONF" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "Done. Push main (or run the CD workflow by hand) to deploy into $SITE/public."
