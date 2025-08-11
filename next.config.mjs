/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enterprise-grade compilation and performance optimizations
  compiler: {
    // Remove console logs in production (keep enterprise logging)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental features for enterprise performance
  experimental: {
    // Enable optimized package imports for enterprise libraries
    optimizePackageImports: ['@reduxjs/toolkit', '@microsoft/signalr'],
  },

  // Enterprise environment variable configuration
  env: {
    // Make enterprise configuration available to the application
    ENTERPRISE_CORRELATION_ENABLED: process.env.ENTERPRISE_CORRELATION_ENABLED,
    ENTERPRISE_TRANSACTION_ENABLED: process.env.ENTERPRISE_TRANSACTION_ENABLED,
    ENTERPRISE_IDEMPOTENCY_ENABLED: process.env.ENTERPRISE_IDEMPOTENCY_ENABLED,
    ENTERPRISE_DEBUG_ENABLED: process.env.ENTERPRISE_DEBUG_ENABLED,
    PERFORMANCE_METRICS_ENABLED: process.env.PERFORMANCE_METRICS_ENABLED,
  },

  // Enterprise headers and CORS configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Enterprise security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Enterprise correlation tracking
          {
            key: 'X-Enterprise-Application',
            value: 'PetLoveCommunity-Web',
          },
        ],
      },
    ];
  },

  // Enterprise webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Enterprise production optimizations
    if (!dev && !isServer) {
      // Tree shaking for enterprise libraries
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Bundle size optimization for enterprise features
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Separate chunk for enterprise services
          enterprise: {
            test: /[\\/]src[\\/](lib[\\/](services|store)|components[\\/]enterprise)[\\/]/,
            name: 'enterprise',
            chunks: 'all',
            priority: 10,
          },
          // Separate chunk for SignalR
          signalr: {
            test: /[\\/]node_modules[\\/]@microsoft[\\/]signalr[\\/]/,
            name: 'signalr',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }

    return config;
  },

  // Enterprise performance and monitoring
  images: {
    // Optimize images for enterprise performance targets
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
  },

  // Enterprise build output optimizations
  output: 'standalone',
  
  // Enterprise logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.ENTERPRISE_DEBUG_ENABLED === 'true',
    },
  },

  // Enterprise API routes configuration
  async rewrites() {
    // Only apply rewrites in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
        },
        {
          source: '/hubs/:path*', 
          destination: `${process.env.NEXT_PUBLIC_API_URL}/hubs/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
