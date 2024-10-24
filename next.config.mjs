// @ts-check
/** @type {import('next').NextConfig} */
// noinspection JSFileReferences
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'url';
import path from 'node:path';
import { globSync } from 'glob';
import * as fs from 'node:fs';

const getDirname = () => {
    const __filename = fileURLToPath(import.meta.url);
    return path.dirname(__filename);
};

/**
 * A Webpack plugin to make specified files or directories executable after the emit stage.
 *
 * @class ExecutablePlugin
 * @param {Object} options - The plugin options.
 * @param {string} options.path - The path or glob pattern to the files or directory to make executable.
 */
class ExecutablePlugin {
    constructor({ path } = {}) {
        if (!path) throw new Error('The path option is required.');
        this.path = path;
    }
    apply(compiler) {
        compiler.hooks.afterEmit.tap('PermissionsPlugin', () => {
            if (process.platform === 'win32') return;
            for (const file of globSync(this.path)) {
                try {
                    const { mode } = fs.statSync(file);
                    const newMode = mode | 0o110;
                    if (mode !== newMode) fs.chmodSync(file, newMode);
                } catch (err) {
                    console.error(`Error processing file: ${file}`, err);
                }
            }
        });
    }
}

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

                config.plugins.push(
                    new ExecutablePlugin({
                        path: `${destinationPath}/index*`,
                    }),
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
