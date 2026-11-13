FROM python:3.14-alpine3.24 AS python-base

ARG TARGETARCH
ARG OAUTH2PROXY_VERSION="7.15.6"

RUN apk add --no-cache py3-pip build-base curl \
  && curl -sL https://github.com/oauth2-proxy/oauth2-proxy/releases/download/v${OAUTH2PROXY_VERSION}/oauth2-proxy-v${OAUTH2PROXY_VERSION}.linux-${TARGETARCH}.tar.gz -o /tmp/oauth2-proxy.tar.gz \
  && tar -xzf /tmp/oauth2-proxy.tar.gz \
  && mv ./oauth2-proxy-v${OAUTH2PROXY_VERSION}.linux-${TARGETARCH}/oauth2-proxy /usr/bin/oauth2-proxy \
  && pip install --upgrade pip setuptools wheel \
  && python3 -m venv /opt/certbot/ \
  && /opt/certbot/bin/pip install --upgrade pip \
  && /opt/certbot/bin/pip install certbot

FROM node:26-alpine3.24 AS base

WORKDIR /app

ARG VERSION=1.0.0

ENV TZ=America/New_York
# ENV PYTHONWARNINGS="ignore:::pkg_resources"

RUN apk add --no-cache \
  iptables tzdata supercronic \
  wireguard-tools conntrack-tools tcpdump nginx nginx-mod-stream python3 supervisor openssl libcap sudo \
  && apk add --no-cache fluent-bit --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing \
  && ln -s /usr/bin/python3.12 /usr/local/bin/python3.12 \
  && ln -s /usr/bin/python3.12 /usr/local/bin/python3

COPY --from=python-base /usr/bin/oauth2-proxy /usr/bin/oauth2-proxy
COPY --from=python-base /opt/certbot /opt/certbot
COPY docker/resources/crontabs /etc/crontabs/
COPY --chown=node:node docker/resources/nginx /etc/nginx/
COPY docker/resources/openssl /etc/openssl/
COPY docker/resources/supervisor /etc/supervisor/
COPY docker/resources/fluent-bit /etc/fluent-bit/
COPY docker/resources/sudoers.d /etc/sudoers.d/

RUN mkdir -p /var/run/supervisor /var/log/supervisor \
  && chown -R node:node /var/run/supervisor /var/log/supervisor /etc/supervisor/conf.d \
  && rm -f /etc/supervisord.conf \
  && ln -s /etc/supervisor/supervisord.conf /etc/supervisord.conf \
  && mkdir -p /var/run/nginx /var/log/nginx /var/lib/nginx /etc/nginx/locations /etc/nginx/ssl /etc/nginx/stream.d /var/www/letsencrypt /var/www/wiredoor-verify \
  && chown -R node:node /var/run/nginx /var/log/nginx /var/lib/nginx /etc/nginx/locations /etc/nginx/ssl /etc/nginx/stream.d /var/www/letsencrypt /var/www/wiredoor-verify \
  && rm -f /etc/nginx/conf.d/stream.conf \
  && mkdir -p /etc/letsencrypt /var/lib/letsencrypt /var/log/letsencrypt \
  && chown -R node:node /etc/letsencrypt /var/lib/letsencrypt /var/log/letsencrypt \
  && mkdir -p /data \
  && chown -R node:node /data \
  && mkdir -p /opt/oauth2-proxy \
  && chown -R node:node /opt/oauth2-proxy \
  && mkdir -p /etc/wireguard \
  && chown -R node:node /etc/wireguard \
  && touch /etc/environment \
  && chown node:node /etc/environment \
  && ln -s /opt/certbot/bin/certbot /usr/bin/certbot \
  && setcap cap_net_bind_service=+ep /usr/sbin/nginx

FROM base AS dev-container

RUN apk add --update git rsync nano curl bash sqlite \
  && rm -f /etc/supervisor/conf.d/app.conf

COPY --chown=node:node docker/resources/init.sh /init.sh

RUN chmod +x /init.sh

CMD [ "bash", "-c", "/init.sh" ]

FROM base AS development

COPY --chown=node:node package*.json .

RUN npm i

COPY --chown=node:node . .

FROM base AS build

COPY --chown=node:node package*.json ./

COPY --chown=node:node --from=development /app/node_modules ./node_modules

COPY --chown=node:node . .

RUN npm run build

RUN npm ci --omit=dev && npm cache clean --force

FROM node:26-alpine3.24 AS uibuild

WORKDIR /app

COPY --chown=node:node frontend/package*.json ./

RUN npm i

COPY --chown=node:node frontend/. .

RUN npm run build

FROM base AS production

ENV NODE_ENV=production

LABEL org.opencontainers.image.licenses=Apache-2.0 \
      org.opencontainers.image.description="Self hosted ingress-as-a-service platform that allows you to expose applications and services running in private or local networks to the internet" \
      org.opencontainers.image.documentation=https://www.wiredoor.net/docs \
      org.opencontainers.image.source=https://github.com/wiredoor/wiredoor \
      org.opencontainers.image.url=https://ghcr.io/wiredoor/wiredoor \
      org.opencontainers.image.title=wiredoor \
      org.opencontainers.image.version=${VERSION}

COPY --chown=node:node --from=build /app/node_modules /app/node_modules
COPY --chown=node:node --from=build /app/dist /app/dist
COPY --chown=node:node --from=uibuild /app/dist /app/dist/public
COPY --chown=node:node docker/resources/init.sh /init.sh

RUN chmod +x /init.sh

USER node

VOLUME ["/etc/letsencrypt","/data"]

CMD [ "/init.sh" ]
