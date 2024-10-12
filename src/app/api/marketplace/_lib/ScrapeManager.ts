export interface Scrape {
    end: () => void;
}

/**
 * Manages ongoing scrapes, making sure the API does not start another search with a term,
 * if such a search is already being processed. Also helps to avoid incomplete replies
 * without hasMore set to true.
 */
class ScrapeManager {
    private static instance: ScrapeManager | null = null;
    private ongoingScrapes: Map<string, Scrape>;

    private constructor() {
        this.ongoingScrapes = new Map<string, Scrape>();
    }

    // Singleton access method
    public static getInstance(): ScrapeManager {
        if (ScrapeManager.instance === null) {
            ScrapeManager.instance = new ScrapeManager();
        }
        return ScrapeManager.instance;
    }

    // Method to start a scrape
    public startScrape(searchTerm: string): Scrape {
        if (this.alreadyScraping(searchTerm)) {
            throw new Error(`Search with term "${searchTerm}" is already in progress.`);
        }

        // Create a new Scrape object
        const scrape: Scrape = {
            end: () => {
                if (this.ongoingScrapes.has(searchTerm)) {
                    this.ongoingScrapes.delete(searchTerm);
                }
            },
        };

        // Add to the ongoing scrape list
        this.ongoingScrapes.set(searchTerm, scrape);
        return scrape;
    }

    // Method to check if a scrape with the same searchTerm is already ongoing
    public alreadyScraping(searchTerm: string): boolean {
        return this.ongoingScrapes.has(searchTerm);
    }
}

export default ScrapeManager;
