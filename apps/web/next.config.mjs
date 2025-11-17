/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    externalDir: true
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ]
  },
  webpack: (config, { isServer }) => {
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
