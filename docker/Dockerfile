FROM node:22-alpine AS base

WORKDIR /app

ARG VERSION=1.0.0

ENV TZ=America/New_York
ENV PYTHONWARNINGS="ignore:::pkg_resources"

RUN apk add --no-cache \
  iptables tzdata supercronic \
  wireguard-tools conntrack-tools tcpdump nginx nginx-mod-stream python3 openssl libcap sudo \
  && apk add --no-cache fluent-bit --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing \
  && ln -s /usr/bin/python3.12 /usr/local/bin/python3.12 \
  && ln -s /usr/bin/python3.12 /usr/local/bin/python3

COPY docker/resources/crontabs /etc/crontabs/
COPY --chown=node:node docker/resources/nginx /etc/nginx/
COPY docker/resources/openssl /etc/openssl/
COPY docker/resources/supervisor /etc/supervisor/
COPY docker/resources/fluent-bit /etc/fluent-bit/
COPY docker/resources/sudoers.d /etc/sudoers.d/

RUN mkdir -p /var/run/supervisor /var/log/supervisor \
  && chown -R node:node /var/run/supervisor /var/log/supervisor \
  && rm -f /etc/supervisord.conf \
  && ln -s /etc/supervisor/supervisord.conf /etc/supervisord.conf \
  && mkdir -p /var/run/nginx /var/log/nginx /var/lib/nginx /etc/nginx/locations /etc/nginx/ssl /etc/nginx/stream.d /var/www/letsencrypt \
  && chown -R node:node /var/run/nginx /var/log/nginx /var/lib/nginx /etc/nginx/locations /etc/nginx/ssl /etc/nginx/stream.d /var/www/letsencrypt \
  && rm -f /etc/nginx/conf.d/stream.conf \
  && mkdir -p /etc/letsencrypt /var/lib/letsencrypt /var/log/letsencrypt \
  && chown -R node:node /etc/letsencrypt /var/lib/letsencrypt /var/log/letsencrypt \
  && mkdir -p /data \
  && chown -R node:node /data \
  && mkdir -p /etc/wireguard \
  && chown -R node:node /etc/wireguard \
  && touch /etc/environment \
  && chown node:node /etc/environment \
  && touch /var/log/supervisor/app.stdout.log \
  && ln -sf /dev/stdout /var/log/supervisor/app.stdout.log \
  && touch /var/log/supervisor/app.stderr.log \
  && ln -sf /dev/stderr /var/log/supervisor/app.stderr.log

RUN setcap cap_net_bind_service=+ep /usr/sbin/nginx

FROM base AS dev-container

RUN apk add --update git rsync nano curl bash sqlite supervisor certbot \
  && rm -f /etc/supervisor/conf.d/app.conf

CMD [ "bash", "-c", "/usr/bin/supervisord -ns -c /etc/supervisor/supervisord.conf" ]

FROM base AS development

COPY --chown=node:node package*.json .

RUN npm i

COPY --chown=node:node . .

FROM python:3.12-alpine AS python-base

ARG OAUTH2PROXY_VERSION="7.12.0"

RUN apk add --no-cache py3-pip build-base curl \
  && curl -sL https://github.com/oauth2-proxy/oauth2-proxy/releases/download/v${OAUTH2PROXY_VERSION}/oauth2-proxy-v${OAUTH2PROXY_VERSION}.linux-amd64.tar.gz -o /tmp/oauth2-proxy.tar.gz \
  && tar -xzf /tmp/oauth2-proxy.tar.gz \
  && mv ./oauth2-proxy-v${OAUTH2PROXY_VERSION}.linux-amd64/oauth2-proxy /usr/bin/oauth2-proxy \
  && pip install --upgrade pip setuptools wheel \
  && pip install --no-cache-dir supervisor \
  && python3 -m venv /opt/certbot/ \
  && /opt/certbot/bin/pip install --upgrade pip \
  && /opt/certbot/bin/pip install certbot \
  && mkdir -p /install/site-packages \
  && cp -r /usr/local/lib/python3.12/site-packages/supervisor /install/site-packages/ \
  && cp -r /usr/local/lib/python3.12/site-packages/supervisor-*.dist-info /install/site-packages/

FROM base AS build

COPY --chown=node:node package*.json ./

COPY --chown=node:node --from=development /app/node_modules ./node_modules

COPY --chown=node:node . .

RUN npm run build

RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine3.21 AS uibuild

WORKDIR /app

COPY --chown=node:node frontend/package*.json ./

RUN npm i

COPY --chown=node:node frontend/. .

RUN npm run build

FROM base AS production

ENV NODE_ENV=production

LABEL org.opencontainers.image.licenses=MIT \
      org.opencontainers.image.description="Self hosted ingress-as-a-service platform that allows you to expose applications and services running in private or local networks to the internet" \
      org.opencontainers.image.documentation=https://www.wiredoor.net/docs \
      org.opencontainers.image.source=https://github.com/wiredoor/wiredoor \
      org.opencontainers.image.url=https://ghcr.io/wiredoor/wiredoor \
      org.opencontainers.image.title=wiredoor \
      org.opencontainers.image.version=${VERSION}

COPY --from=python-base /usr/bin/oauth2-proxy /usr/bin/oauth2-proxy
COPY --from=python-base /install/site-packages/ /usr/lib/python3.12/site-packages/
COPY --from=python-base /usr/local/bin/supervisord /usr/local/bin/supervisorctl /usr/bin/
COPY --from=python-base /opt/certbot /opt/certbot
COPY --chown=node:node --from=build /app/node_modules /app/node_modules
COPY --chown=node:node --from=build /app/dist /app/dist
COPY --chown=node:node --from=uibuild /app/dist /app/dist/public
COPY --chown=node:node docker/resources/init.sh /init.sh

RUN chmod +x /init.sh \
  && ln -s /opt/certbot/bin/certbot /usr/bin/certbot

USER node

VOLUME ["/etc/letsencrypt","/data"]

CMD [ "/init.sh" ]
