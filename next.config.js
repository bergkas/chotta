// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Nutze die vordefinierten Cache-Regeln
  runtimeCaching: require('next-pwa/cache'),
})

module.exports = withPWA({
  // (Hier können deine sonstigen Next.js-Optionen stehen)
})
