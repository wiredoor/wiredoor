#!/bin/bash
set -e

env | while IFS='=' read -r key value; do
  printf '%s=%q\n' "$key" "$value"
done > /etc/environment

exec /usr/bin/supervisord -ns -c /etc/supervisor/supervisord.conf