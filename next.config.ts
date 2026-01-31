import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/PokeAPI/sprites/**',
      },
    ],
  },
  // Trailing slashes for SEO consistency
  trailingSlash: true,
  // Rewrite / to show /vgc/reg-f/ content without changing URL
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/vgc/reg-f/',
      },
    ];
  },
};

export default nextConfig;
