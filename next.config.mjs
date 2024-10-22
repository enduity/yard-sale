// @ts-check
/** @type {import('next').NextConfig} */
// noinspection JSFileReferences
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'url';
import path from 'node:path';

const getDirname = () => {
    const __filename = fileURLToPath(import.meta.url);
    return path.dirname(__filename);
};

const nextConfig = (phase) => {
    const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER;
    const isProductionBuild = phase === PHASE_PRODUCTION_BUILD;

    return {
        experimental: {
            instrumentationHook: true,
        },
        webpack: (config, { isServer }) => {
            if (isServer && (isDevelopment || isProductionBuild)) {
                // Dynamically load the CopyWebpackPlugin only in development or production build
                const require = createRequire(import.meta.url);
                const CopyWebpackPlugin = require('copy-webpack-plugin');
                const cycleTlsPath = path.dirname(require.resolve('cycletls'));
                const executableFilenames = [
                    'index.exe',
                    'index-arm',
                    'index-arm64',
                    'index',
                    'index-mac',
                    'index-mac-arm64',
                    'index-freebsd',
                ];

                // Define the destination path where CycleTLS expects the executable
                const destinationPath = path.resolve(
                    getDirname(),
                    '.next/server/cycletls',
                );

                // Add the CopyWebpackPlugin to copy the executable
                config.plugins.push(
                    new CopyWebpackPlugin({
                        patterns: executableFilenames.map((filename) => ({
                            from: path.join(cycleTlsPath, filename),
                            to: destinationPath,
                        })),
                    }),
                );
            }
            return config;
        },
    };
};

export default nextConfig;
