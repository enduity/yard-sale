# Stage 1: Build
FROM node:20-alpine AS builder

# Install dependencies required for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    && apk add --no-cache --virtual .build-deps \
    gcc \
    g++ \
    python3 \
    make

WORKDIR /app

# Copy only the package files for dependency installation
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Generate Prisma client and build the app
RUN npx prisma generate
RUN pnpm run build

# Remove development dependencies and build-time files
RUN pnpm prune --prod

# Stage 2: Production
FROM node:20-alpine

# Install Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont

WORKDIR /app

# Copy the build output and production dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/.env ./.env

# Make CycleTLS binaries executable
RUN chmod +x .next/server/cycletls/index*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Set the Node.js environment to production
ENV NODE_ENV=production

# Set the default database URL
ENV DATABASE_URL=file:./prisma/prod.db

# Expose the port that Next.js will run on
EXPOSE 3000

# Run the app
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
