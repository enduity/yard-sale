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

            // Construct the path to index within the package
            const cycleTlsIndexExePath = path.join(
                cycleTlsPath,
                'index' + (process.platform === 'win32' ? '.exe' : ''),
            );

            // Define the destination path where CycleTLS expects the executable
            const destinationPath = path.resolve(
                getDirname(),
                '.next/server/vendor-chunks',
                'index' + (process.platform === 'win32' ? '.exe' : ''),
            );

            // Add the CopyWebpackPlugin to copy the executable
            config.plugins.push(
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            from: cycleTlsIndexExePath,
                            to: destinationPath,
                        },
                    ],
                }),
            );
        }
        return config;
    },
};

export default nextConfig;
