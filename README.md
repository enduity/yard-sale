# Yard Sale

Yard Sale is a personal project built with [Next.js](https://nextjs.org) that aggregates listings from various online
marketplaces in Estonia, including Facebook Marketplace, Osta.ee, and Okidoki. It is not designed with general usage in
mind, rather as a functional demo, demonstrating integration of web scraping, data aggregation, and a responsive user
interface.

## Features

- **Cross-Marketplace Aggregation**: Fetches and displays listings from multiple sources in Estonia.
- **Progressive Loading**: Uses a ReadableStream to load listings progressively as they become available, reducing
  initial load times.
- **Filtering**: Supports filtering listings by item condition (new or used) and a maximum number of days listed.
- **Caching Mechanism**: Implements a caching layer to improve query performance and reduce redundant scraping.

## Tech Stack

- **Frontend**: Next.js (TypeScript), Tailwind CSS
- **Backend**: Next.js API routes, CycleTLS and Puppeteer for scraping, Prisma ORM
- **Database**: SQLite (for simplicity and ease of setup)
- **Development**: ESLint, Prettier

## Getting Started

### Prerequisites

- Ensure you have [pnpm](https://pnpm.io/) installed.
- Node.js version 20 or higher is recommended.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/enduity/yard-sale.git
   cd yard-sale
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Apply database migrations (also creates the SQLite database):

   ```bash
   pnpm prisma migrate deploy
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action.

### Environment Variables

The default `.env` file includes:

```bash
DATABASE_URL="file:./dev.db"   # Relative to the 'prisma' directory
```

You can customize this if you need a different database path or environment setup.

## Scripts

- `pnpm dev`: Runs the development server.
- `pnpm build`: Builds the project for production.
- `pnpm start`: Starts the Next.js server in production mode.

## Notes

- **Rate Limits**: The scraping process is resource-intensive, so the application has low rate limits to avoid
  overloading the sources and getting blocked.
- **Database**: While SQLite is used for simplicity, Prisma makes it easy to switch to another database if needed.

## License

This project is licensed under the GPL-3.0 License. See the `LICENSE.md` file for more details.
