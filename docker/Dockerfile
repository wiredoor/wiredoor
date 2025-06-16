FROM node:20-alpine3.21 AS base

WORKDIR /app

ARG VERSION=1.0.0

ENV TZ=America/New_York

RUN apk add --update \
  dpkg iptables gawk tzdata \
  wireguard-tools tcpdump nginx nginx-mod-stream supervisor openssl certbot \
  && apk add --no-cache fluent-bit --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing

COPY docker/resources/crontabs /etc/crontabs/
COPY docker/resources/nginx /etc/nginx/
COPY docker/resources/openssl /etc/openssl/
COPY docker/resources/supervisor /etc/supervisor/
COPY docker/resources/fluent-bit /etc/fluent-bit/

RUN mkdir -p /var/log/supervisor \
  && mkdir -p /var/www/letsencrypt \
  && mkdir -p /data \
  && rm -f /etc/nginx/conf.d/stream.conf \
  && touch /var/log/supervisor/app.stdout.log \
  && ln -sf /dev/stdout /var/log/supervisor/app.stdout.log \
  && touch /var/log/supervisor/app.stderr.log \
  && ln -sf /dev/stderr /var/log/supervisor/app.stderr.log

FROM base AS dev-container

RUN apk add --update git rsync nano curl bash sqlite \
  && rm -f /etc/supervisor/conf.d/app.conf

CMD [ "bash", "-c", "/usr/bin/supervisord -ns -c /etc/supervisor/supervisord.conf" ]

FROM base AS development

COPY --chown=node:node package*.json .

RUN npm i

COPY --chown=node:node . .

FROM base AS build

ARG OAUTH2PROXY_VERSION="7.9.0"
ARG NGINX_EXPORTER_VERSION="1.4.2"

RUN apk add --update curl \
  && curl -sL https://github.com/oauth2-proxy/oauth2-proxy/releases/download/v${OAUTH2PROXY_VERSION}/oauth2-proxy-v${OAUTH2PROXY_VERSION}.linux-amd64.tar.gz -o /tmp/oauth2-proxy.tar.gz \
  && tar -xzf /tmp/oauth2-proxy.tar.gz \
  && mv ./oauth2-proxy-v${OAUTH2PROXY_VERSION}.linux-amd64/oauth2-proxy /usr/bin/oauth2-proxy

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

COPY --from=build /usr/bin/oauth2-proxy /usr/bin/oauth2-proxy
COPY --chown=node:node --from=build /app/node_modules /app/node_modules
COPY --chown=node:node --from=build /app/dist /app/dist
COPY --chown=node:node --from=uibuild /app/dist /app/dist/public
COPY --chown=node:node docker/resources/init.sh /init.sh

RUN chmod +x /init.sh

VOLUME ["/etc/letsencrypt","/data"]

CMD [ "/init.sh" ]

# USER node
