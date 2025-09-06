/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'ockbpehnsndpzibjozkn.supabase.co',
    ],
  },
  async rewrites() {
    // Proxy finatra-api through Next to avoid cross-origin cookie issues in dev
    const target = process.env.FINATRA_API_URL || 'http://localhost:3333';
    console.log('[Next.js] API proxy target:', target);
    return [
      {
        source: '/finatra-api/:path*',
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
