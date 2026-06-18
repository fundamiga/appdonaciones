import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  // 🔧 FIX: Añadir cabeceras para evitar errores de Trusted Types en Impresión
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' res.cloudinary.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com;",
          },
        ],
      },
    ];
  },
  webpack: (config: any) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // @ts-ignore - Next.js config types might complain, but this ignores lint during Vercel builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // @ts-ignore - Next.js config types might complain
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveAlias: {
      canvas: './empty-canvas.js',
    },
  },
};

export default nextConfig;
