// pages/api/manifest/[id].js
export default function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).end()

  const manifest = {
    name: 'Chotta',
    short_name: 'Chotta',
    start_url: `/meta/${id}`,
    display: 'standalone',
    scope: '/',
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  }

  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(manifest))
}
