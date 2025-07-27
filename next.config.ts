import type { NextConfig } from "next";

// Disable tracing to avoid permission issues
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NEXT_TRACE = 'false';

const nextConfig: NextConfig = {
  // Telemetry is disabled via environment variable above
  
  // Skip ESLint during build for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Skip TypeScript checks during build (will be handled separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Performance optimizations for development
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      'lucide-react',
      'framer-motion'
    ],
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce bundle size in development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    return config;
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },
  
  // Static optimization
  staticPageGenerationTimeout: 1000,
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  

};

export default nextConfig;
