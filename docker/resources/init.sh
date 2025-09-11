#!/bin/bash
set -e

# --- Permission preflight for upgrades to v1.5.0 ---
for dir in /data /var/log/nginx /etc/letsencrypt; do
  if [ -e "$dir" ]; then
    owner="$(stat -c '%u:%g' "$dir" 2>/dev/null || echo '?')"
    if [ "$owner" = "0:0" ]; then
      echo "[WARN] Detected $dir owned by root (0:0)."
      echo "[WARN] Wiredoor v1.5.0 runs as non-root (1000:1000)."
      echo "[WARN] Please run the following command before upgrading:"
      echo "       docker compose exec -u root wiredoor chown -R 1000:1000 $dir"
      echo
    fi
  fi
done

mkdir -p /data/ssl

openssl genpkey -algorithm RSA -out /data/ssl/privkey.key >> /dev/null 2>&1
openssl req -new -key /data/ssl/privkey.key -out /data/ssl/default.csr -config /etc/openssl/openssl.cnf >> /dev/null 2>&1
openssl x509 -req -days 3650 -in /data/ssl/default.csr -signkey /data/ssl/privkey.key -out /data/ssl/cert.crt >> /dev/null 2>&1

ln -sfn /data/ssl/privkey.key /etc/nginx/ssl/privkey.key
ln -sfn /data/ssl/cert.crt /etc/nginx/ssl/cert.crt

env | while IFS='=' read -r key value; do
  printf '%s=%q\n' "$key" "$value"
done > /etc/environment

exec /usr/bin/supervisord -ns -c /etc/supervisor/supervisord.conf