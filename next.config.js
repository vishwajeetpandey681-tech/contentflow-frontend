/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,

  // Standalone bundle for Docker / VPS (smaller runtime image)
  output: 'standalone',

  // Image optimization — allow external article thumbnails
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: false,
  },

  // Compress responses
  compress: true,

  // Power header opt-out
  poweredByHeader: false,

  async headers() {
    const base = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]
    // HSTS on plain http://localhost confuses some embedded browsers and is unnecessary in dev.
    if (process.env.NODE_ENV === 'production') {
      base.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      })
    }
    return [{ source: '/:path*', headers: base }]
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4500/api'
    const target = apiUrl.replace(/\/api\/?$/, '')
    return [
      { source: '/api/:path*', destination: `${target}/api/:path*` },
    ]
  },
}

module.exports = nextConfig
