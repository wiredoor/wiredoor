export default {
  app: {
    url: import.meta.env.VITE_APP_URL,
    env: import.meta.env.VITE_ENVIRONMENT || 'production',
  },
  api: {
    url: import.meta.env.VITE_API_URL,
  },
}
