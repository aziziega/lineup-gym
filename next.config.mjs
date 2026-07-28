/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hjcavtketqqzpwepeori.supabase.co',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@opentelemetry/ },
      { module: /@prisma\/instrumentation/ },
      /Critical dependency: the request of a dependency is an expression/,
    ];
    return config;
  },
};

export default nextConfig;
