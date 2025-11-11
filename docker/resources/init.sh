#!/bin/bash
set -e

FAIL=0

# --- Permission preflight for upgrades to v1.5.0 ---
for dir in /data /var/log/nginx /etc/letsencrypt; do
  if [ -e "$dir" ]; then
    owner="$(stat -c '%u:%g' "$dir" 2>/dev/null || echo '?')"
    if [ "$owner" != "1000:1000" ]; then
      if [ "$FAIL" = "0" ]; then
        echo "------------------------------------------------------------------------------"
        echo "[WARN] Some directories are not owned by UID:GID 1000:1000"
        echo "[WARN] Wiredoor v1.5.0 runs as non-root (1000:1000)."
        echo "[WARN] Please run the following commands before upgrading:"
        echo
      fi
      echo "  docker compose run --rm -u root wiredoor chown -R 1000:1000 $dir"
      FAIL=1
    fi
  fi
done

if [ "$FAIL" = "1" ]; then
  echo
  echo "       docker compose pull wiredoor"
  echo "       docker compose up -d --force-recreate wiredoor"
  echo
  echo "[ERROR] Permission preflight failed."
  echo "Visit https://github.com/wiredoor/wiredoor/releases/tag/v1.5.0 for more info."
  echo "------------------------------------------------------------------------------"
  exit 1
fi

mkdir -p /data/ssl /data/quic

if [ ! -f /data/quic/quic_host.key ]; then
  openssl rand -out /data/quic/quic_host.key 32
fi

chmod 600 /data/quic/quic_host.key

openssl genpkey -algorithm RSA -out /data/ssl/privkey.key >> /dev/null 2>&1
openssl req -new -key /data/ssl/privkey.key -out /data/ssl/default.csr -config /etc/openssl/openssl.cnf >> /dev/null 2>&1
openssl x509 -req -days 3650 -in /data/ssl/default.csr -signkey /data/ssl/privkey.key -out /data/ssl/cert.crt >> /dev/null 2>&1

ln -sfn /data/ssl/privkey.key /etc/nginx/ssl/privkey.key
ln -sfn /data/ssl/cert.crt /etc/nginx/ssl/cert.crt

env | while IFS='=' read -r key value; do
  printf '%s=%q\n' "$key" "$value"
done > /etc/environment

exec /usr/bin/supervisord -ns -c /etc/supervisor/supervisord.conf