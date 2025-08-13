#!/bin/bash
set -e

mkdir -p /data/ssl

openssl genpkey -algorithm RSA -out /data/ssl/privkey.key
openssl req -new -key /data/ssl/privkey.key -out /data/ssl/default.csr -config /etc/openssl/openssl.cnf
openssl x509 -req -days 3650 -in /data/ssl/default.csr -signkey /data/ssl/privkey.key -out /data/ssl/cert.crt

ln -sfn /data/ssl/privkey.key /etc/nginx/ssl/privkey.key
ln -sfn /data/ssl/cert.crt /etc/nginx/ssl/cert.crt

env | while IFS='=' read -r key value; do
  printf '%s=%q\n' "$key" "$value"
done > /etc/environment

exec /usr/bin/supervisord -ns -c /etc/supervisor/supervisord.conf