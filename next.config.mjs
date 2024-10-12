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
            // Dynamically find the path to the selenium-webdriver package
            const seleniumWebdriverPath = path.dirname(
                require.resolve('selenium-webdriver'),
            );

            // Construct the path to selenium-manager.exe within the package
            const seleniumManagerPath = path.join(
                seleniumWebdriverPath,
                'bin',
                process.platform === 'win32' ? 'windows' : process.platform,
                'selenium-manager' + (process.platform === 'win32' ? '.exe' : ''),
            );

            // Define the destination path where Selenium expects the executable
            const destinationPath = path.resolve(
                getDirname(),
                '.next/server/bin',
                process.platform === 'win32' ? 'windows' : process.platform,
                'selenium-manager' + (process.platform === 'win32' ? '.exe' : ''),
            );

            // Add the CopyWebpackPlugin to copy the executable
            config.plugins.push(
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            from: seleniumManagerPath,
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
