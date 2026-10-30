/** @type {import('next').NextConfig} */
const nextConfig = {
  // Coolify runs `npm start`; the standalone output is not used
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
