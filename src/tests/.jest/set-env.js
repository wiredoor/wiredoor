// eslint-disable-next-line no-undef
process.env = Object.assign(process.env, {
  DB_DATABASE: ':memory:',
  ADMIN_EMAIL: 'admin',
  ADMIN_PASSWORD: 'admin',
  PRIVATE_SECRET: 'super_secret',
  TCP_SERVICES_PORT_RANGE: '15000-16000',
  OAUTH2_PROXY_PROVIDER: 'google',
  OAUTH2_PROXY_CLIENT_ID: 'example',
  OAUTH2_PROXY_CLIENT_SECRET: 'example',
});
