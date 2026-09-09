/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // camera/microphone opened to (self) for COR-18's LiveKit rehearsal
          // video -- was fully disabled before, which blocks getUserMedia()
          // site-wide regardless of what LiveKit's client SDK requests.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
