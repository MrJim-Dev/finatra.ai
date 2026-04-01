/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ockbpehnsndpzibjozkn.supabase.co'],
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
