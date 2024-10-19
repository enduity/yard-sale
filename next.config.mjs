/** @type {import('next').NextConfig} */
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'url';
import path from 'node:path';

const getDirname = () => {
    const __filename = fileURLToPath(import.meta.url);
    return path.dirname(__filename);
};

const nextConfig = {
    webpack: (config, { isServer }) => {
        if (isServer) {
            const require = createRequire(import.meta.url);
            // Dynamically find the path to the cycletls package
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
                '.next/server/vendor-chunks',
            );

            // Add the CopyWebpackPlugin to copy the executable
            config.plugins.push(
                new CopyWebpackPlugin({
                    patterns: executableFilenames.map((filename) => ({
                        from: path.join(cycleTlsPath, filename),
                        to: path.join(destinationPath, filename),
                    })),
                }),
            );
        }
        return config;
    },
};

export default nextConfig;
