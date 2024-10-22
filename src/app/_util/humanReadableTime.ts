/**
 * Converts seconds to a human-readable time string.
 *
 * @param seconds - The number of seconds to convert.
 * @returns A human-readable time string, e.g. "1d 2h 3m 4s".
 */
export function humanReadableTime(seconds: number) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor(((seconds % 86400) % 3600) / 60);
    const remainingSeconds = Math.floor(((seconds % 86400) % 3600) % 60);

    const dayString = days > 0 ? `${days}d` : '';
    const hourString = hours > 0 ? `${hours}h` : '';
    const minuteString = minutes > 0 ? `${minutes}m` : '';
    const secondString = remainingSeconds > 0 ? `${remainingSeconds}s` : '';

    return [dayString, hourString, minuteString, secondString].join(' ');
}
