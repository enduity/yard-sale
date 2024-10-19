import { CycleTLSClient } from 'cycletls';

export async function fetchWithCycleTLS(
    cycleTLS: CycleTLSClient,
    url: string,
    body: string,
) {
    const result = await cycleTLS(
        url,
        {
            body: body,
            ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,10-51-0-11-35-5-16-27-65281-45-23-43-17513-18-65037-13,25497-29-23-24,0',
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        },
        'get',
    );
    return result;
}
