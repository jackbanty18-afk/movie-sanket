/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow production builds to succeed even if there are ESLint errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow production builds to succeed even if there are TypeScript errors
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
