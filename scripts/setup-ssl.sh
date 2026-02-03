#!/usr/bin/env bash
set -euo pipefail
DOMAIN="${1:-}"
EMAIL="${2:-}"
STAGING="${3:-}"
if [ -z "${DOMAIN}" ] || [ -z "${EMAIL}" ]; then
  echo "Usage: $0 <domain> <email> [--staging]"
  exit 1
fi
need_cmd() {
  command -v "$1" >/dev/null 2>&1 || return 1
}
sudo true
if ! need_cmd nginx; then
  if need_cmd apt-get; then
    sudo apt-get update -y
    sudo apt-get install -y nginx
  elif need_cmd yum; then
    sudo yum install -y nginx
    sudo systemctl enable nginx || true
  fi
fi
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"
NGINX_LINK="/etc/nginx/sites-enabled/${DOMAIN}.conf"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
if [ ! -f "${NGINX_CONF}" ]; then
  sudo bash -c "cat > '${NGINX_CONF}' <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF"
fi
if [ ! -f "${NGINX_LINK}" ]; then
  sudo ln -s "${NGINX_CONF}" "${NGINX_LINK}"
fi
sudo nginx -t
sudo systemctl reload nginx || sudo service nginx reload || true
if ! need_cmd certbot; then
  if need_cmd apt-get; then
    sudo apt-get update -y
    sudo apt-get install -y certbot python3-certbot-nginx
  elif need_cmd yum; then
    sudo yum install -y certbot python3-certbot-nginx || true
  elif need_cmd snap; then
    sudo snap install core || true
    sudo snap refresh || true
    sudo snap install --classic certbot
    sudo ln -sf /snap/bin/certbot /usr/bin/certbot
  fi
fi
CERTBOT_ARGS=(--nginx -d "${DOMAIN}" --redirect -m "${EMAIL}" --agree-tos --non-interactive)
if [ "${STAGING:-}" = "--staging" ]; then
  CERTBOT_ARGS+=(--staging)
fi
sudo certbot "${CERTBOT_ARGS[@]}"
sudo systemctl reload nginx || sudo service nginx reload || true
echo "SSL installed for ${DOMAIN}"
