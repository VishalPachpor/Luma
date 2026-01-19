import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js 16 Configuration
  // Note: cacheComponents is disabled due to Three.js and framer-motion 
  // using Math.random() which is incompatible with prerendering.
  // Enable when these libraries add proper Suspense support.
  // cacheComponents: true,

  // Configure image domains for external images
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Transpile Three.js packages for proper bundling
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

export default nextConfig;
