/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '..'),
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.next/**'],
      };
    }
    return config;
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/ws',
        destination: `${backendUrl}/ws`,
      },
    ];
  },
};

module.exports = nextConfig;
