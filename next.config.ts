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
  // Permanent redirect from / to /vgc/reg-f/
  async redirects() {
    return [
      {
        source: '/',
        destination: '/vgc/reg-f/',
        permanent: true, // 308 redirect
      },
    ];
  },
};

export default nextConfig;
