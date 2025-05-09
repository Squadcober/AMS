let userConfig = undefined
try {
  userConfig = await import('next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  experimental: {
    serverActions: true,
    isrMemoryCacheSize: 0,
    optimizeCss: false,
    optimizePackageImports: false,
  },
  // Force dynamic rendering for all pages
  reactStrictMode: true,
  staticPageGenerationTimeout: 0,
  compiler: {
    removeConsole: false,
  },
  // Add proper dynamic config
  appDir: true,
  // Force all pages to be dynamic by default
  runtime: 'nodejs',
  generateEtags: false,
  // Prevent static optimization
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
  // Force pages to be dynamic
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Configure build options
  webpack: (config, { dev, isServer }) => {
    // Force all pages to be server-side rendered
    if (!dev && !isServer) {
      Object.assign(config.resolve.alias, {
        'next/dynamic': 'next/dynamic',
      });
    }
    return config;
  }
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
