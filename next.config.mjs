// next.config.mjs
import withPWA from 'next-pwa'

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline.html',
  },
  runtimeCaching: [
    {
      urlPattern: /^\/_next\/.*/,
      handler: 'NetworkFirst',
    },
    {
      urlPattern: /^.*\.(js|css|png|jpg|svg|woff2?)$/,
      handler: 'CacheFirst',
    },
  ],
})
