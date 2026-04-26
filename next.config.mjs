/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kufahfzqwtarzjsaynfd.supabase.co",
        pathname: "/storage/v1/object/public/**", // ✅ IMPORTANT
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