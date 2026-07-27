import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ['lucide-react'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        '@midnight-ntwrk/ledger-v8',
        '@midnight-ntwrk/onchain-runtime-v3',
        '@midnight-ntwrk/midnight-js-protocol',
        '@midnight-ntwrk/midnight-js-contracts',
        '@midnight-ntwrk/midnight-js-http-client-proof-provider',
        '@midnight-ntwrk/midnight-js-indexer-public-data-provider',
        '@midnight-ntwrk/midnight-js-level-private-state-provider',
        '@midnight-ntwrk/midnight-js-fetch-zk-config-provider',
        '@midnight-ntwrk/compact-runtime',
      ];
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
        stream: false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        ws: path.resolve(__dirname, 'lib/ws-shim.js'),
        'isomorphic-ws': path.resolve(__dirname, 'lib/ws-shim.js'),
      };
      config.externals = [...(config.externals || []), 'classic-level', 'leveldown'];
    }
    return config;
  },
};

export default nextConfig;
