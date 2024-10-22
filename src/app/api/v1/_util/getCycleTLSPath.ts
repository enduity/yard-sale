import path from 'node:path';

/**
 * Get the path to the CycleTLS binary for the current platform.
 * Necesssary because Next.js does not package the binary by default and CycleTLS
 * will not find the binary without specifying the path.
 *
 * @returns The path to the CycleTLS binary for the current platform.
 */
export function getCycleTLSPath() {
    const PLATFORM_BINARIES = {
        win32: { x64: 'index.exe' },
        linux: { arm: 'index-arm', arm64: 'index-arm64', x64: 'index' },
        darwin: { x64: 'index-mac', arm: 'index-mac-arm', arm64: 'index-mac-arm64' },
        freebsd: { x64: 'index-freebsd' },
    };
    const basePath = path.join(process.cwd(), '.next', 'server', 'cycletls');
    let platform = process.platform;
    let arch = process.arch;
    if (!(platform in PLATFORM_BINARIES)) {
        throw new Error(`CycleTLS unsupported platform: ${platform}`);
    }
    platform = platform as keyof typeof PLATFORM_BINARIES;
    if (!(arch in PLATFORM_BINARIES[platform])) {
        throw new Error(`CycleTLS unsupported architecture: ${arch}`);
    }
    arch = arch as keyof (typeof PLATFORM_BINARIES)[typeof platform];
    return path.join(basePath, PLATFORM_BINARIES[platform][arch]);
}
