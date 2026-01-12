import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiSrcPath = path.resolve(__dirname, '../api/src');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@collabverse/api'],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    externalDir: true
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ]
  },
  webpack: (config, { isServer }) => {
    // Ensure workspace package paths resolve consistently in webpack.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@collabverse/api': apiSrcPath
    };
    // Exclude Node.js built-in modules from client bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        perf_hooks: false,
      };
    }

    // Add a plugin to handle node: URIs by converting them to regular module names
    config.plugins = config.plugins || [];
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.normalModuleFactory.tap('NodeProtocolPlugin', (nmf) => {
          nmf.hooks.beforeResolve.tap('NodeProtocolPlugin', (data) => {
            if (data.request && data.request.startsWith('node:')) {
              data.request = data.request.replace(/^node:/, '');
            }
          });
        });
      },
    });

    return config;
  }
};
export default nextConfig;
