import { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

export function axiosRetry(
    axiosInstance: AxiosInstance,
    retries: number = 3,
    baseDelay: number = 200
) {
    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const config = error.config as AxiosRequestConfig & { retryCount?: number };
            config.retryCount = config.retryCount || 0;

            if (config.retryCount < retries) {
                config.retryCount += 1;

                const delay = Math.min(
                    baseDelay * 2 ** (config.retryCount - 1) + Math.random() * 100,
                    30000
                );

                console.log(
                    `Retrying request... Attempt #${config.retryCount} in ${delay}ms`
                );

                await new Promise((resolve) => setTimeout(resolve, delay));

                return axiosInstance(config);
            }

            return Promise.reject(error);
        }
    );
}
