import axios from 'axios';
import axiosRetry from 'axios-retry';

const axiosInstance = axios.create({
    baseURL: '/',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});
axiosRetry(axios, { retries: 0, retryDelay: axiosRetry.exponentialDelay });

export { axiosInstance };
