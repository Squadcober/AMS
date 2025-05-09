/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve Node.js modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        'timers/promises': false,
        dns: false,
        dgram: false,
        'mongodb-client-encryption': false
      }
      config.externals = [
        ...(config.externals || []),
        'mongodb-client-encryption'
      ]
    }
    return config
  }
}

module.exports = nextConfig
