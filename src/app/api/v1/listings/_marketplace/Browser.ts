import puppeteer, { Browser as BrowserType, GoToOptions, Page } from 'puppeteer';

export class Browser {
    private browser!: Promise<BrowserType>;
    private readonly TIMEOUT: number;
    private readonly USER_AGENT =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

    constructor(_timeout: number = 10000) {
        this.TIMEOUT = _timeout;
        this.init();
    }

    private init(
        HeadLess: boolean = false,
        SlowDown: number = 0,
        DevTools: boolean = true,
    ) {
        if (!this.browser) {
            this.browser = this.startBrowser(HeadLess, SlowDown, DevTools);
        }

        // Listen to Disconnect event, and restart.
        this.browser.then((browserInstance) => {
            browserInstance.on('disconnected', async () => {
                console.error('Puppeteer browser crashed, restarting browser.');
                await this.releaseBrowser();
                if (browserInstance.process() != null)
                    browserInstance.process()!.kill('SIGINT');
                this.init();
            });
        });
    }

    private async startBrowser(
        HeadLess: boolean,
        SlowDown: number,
        DevTools: boolean,
    ): Promise<BrowserType> {
        return await puppeteer.launch({
            headless: HeadLess,
            devtools: DevTools,
            slowMo: SlowDown,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
            ],
        });
    }

    /**
     * Use the browser to perform an operation with a page.
     * If the browser is already in use, the operation will be queued.
     *
     * @param URL The URL to navigate to
     * @param options The options to pass to the page.goto method
     * @param pageHandler The function to execute with the page
     * @returns The result of the pageHandler function
     */
    public async usePage<T>(
        URL: string,
        options: GoToOptions,
        pageHandler: (page: Page) => Promise<T>,
    ): Promise<T>;

    /**
     * Use the browser to perform an operation with a page.
     * If the browser is already in use, the operation will be queued.
     *
     * @param URL The URL to navigate to
     * @param options The options to pass to the page.goto method
     * @param pageHandler The generator function to execute with the page
     * @returns An async generator that yields items from the pageHandler
     */
    public usePage<T>(
        URL: string,
        options: GoToOptions,
        pageHandler: (page: Page) => AsyncGenerator<T>,
    ): AsyncGenerator<T>;

    public async *usePage<T>(
        URL: string,
        options: GoToOptions,
        pageHandler: (page: Page) => Promise<T> | AsyncGenerator<T>,
    ): Promise<T> | AsyncGenerator<T> {
        try {
            console.info('Opening page:', URL);
            const page = await this._createPageInternal(URL, options);
            const functionResult = pageHandler(page);

            if (functionResult instanceof Promise) {
                return await functionResult;
            } else {
                for await (const item of functionResult) {
                    yield item;
                }
            }

            // Clear cookies and local storage before closing the page
            await page.evaluate(() => {
                window.localStorage.clear();
                document.cookie = '';
            });

            console.info('Closing page:', URL);
            await page.close();
        } finally {
            await this.releaseBrowser(); // Close the browser after the page usage is completed.
        }
    }

    private async _createPageInternal(URL: string, options: GoToOptions): Promise<Page> {
        const browser = await this.browser;
        const page = await browser.newPage();

        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
            hasTouch: false,
            isLandscape: false,
            isMobile: false,
        });

        await page.setUserAgent(this.USER_AGENT);
        await page.setJavaScriptEnabled(true);
        page.setDefaultNavigationTimeout(this.TIMEOUT);

        // Skips fonts and images for performance and efficiency
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.resourceType() === 'font' || req.resourceType() === 'image') {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(URL, options);
        return page;
    }

    private async releaseBrowser() {
        console.warn('Puppeteer browser releasing and closing.');
        const browser = await this.browser;
        await browser.close();
    }

    public async close() {
        console.warn('Puppeteer browser closing.');
        const browser = await this.browser;
        await browser.close();
    }
}
