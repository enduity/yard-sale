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
- **Proxy Handling**: Automatically rotates proxies given in an array, detects blocked IPs, and retries requests.

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

### Using Docker

Running this project with Docker is the recommended approach for ease and consistency. Follow the steps below to get
started:

1. **Pull the Latest Docker Image**

   Retrieve the most recent Docker image from the GitHub Container Registry by executing:

   ```bash
   docker pull ghcr.io/enduity/yard-sale:latest
   ```

2. **Set Up Docker Compose**

   Create a `docker-compose.yml` file in your project directory with the following configuration:

   ```yaml
   services:
     yard-sale:
       image: ghcr.io/enduity/yard-sale:latest
       ports:
         - "80:3000"  
       # Ensure Puppeteer has the necessary capabilities
       shm_size: '1gb'
   ```

   This setup maps port `80` on your host machine to port `3000` inside the Docker container, where the application is
   running.

3. **Launch the Container**

   Start the Docker container using Docker Compose with the command:

   ```bash
   docker-compose up -d
   ```

   The `-d` flag runs the container in detached mode, allowing it to operate in the background.

4. **Enable HTTPS (Optional but Recommended)**

   For secure HTTPS support, it's advisable to configure an additional reverse proxy. Tools like Nginx or Traefik can be
   integrated to handle SSL termination and provide enhanced security for your application.

### Environment Variables

The default `.env` file includes:

```bash
DATABASE_URL="file:./dev.db"   # Relative to the 'prisma' directory
```

To use proxies, configure the `YARD_SALE_PROXIES` environment variable with a comma-separated list of proxy URLs:

```bash
YARD_SALE_PROXIES="http://user:pass@host:port,socks5://user:pass@host:port"
```

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
