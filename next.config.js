/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      dns: false,
      fs: false,
      async_hooks: false,
    };
    config.output.chunkLoadTimeout = 30000; // Increase timeout to 30 seconds
    return config;
  },
}

module.exports = nextConfig
