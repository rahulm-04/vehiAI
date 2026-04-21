import { Value } from '@radix-ui/react-select';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsHmrCache: false,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kufahfzqwtarzjsaynfd.supabase.co",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/embed",
        headers: [
          {
            key: "content-security-policy",
            value: "frame-src 'self' https://raahulix44.created.app;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;