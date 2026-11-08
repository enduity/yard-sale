# Stage 1: Build
FROM node:26-alpine AS builder

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
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install -g 'pnpm@^12.0.0' && pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Generate Prisma client and build the app
RUN pnpm run build

# Remove development dependencies and build-time files
RUN pnpm prune --prod

# Stage 2: Production
FROM node:26-alpine

# Install Chromium for Puppeteer and glibc compatibility for CycleTLS
RUN apk add --no-cache \
    chromium \
    gcompat \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont

WORKDIR /app

# Copy the build output and production dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/.env ./.env

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Set the Node.js environment to production
ENV NODE_ENV=production

# Set the default database URL
ENV DATABASE_URL=file:./prisma/prod.db

# Expose the port that Next.js will run on
EXPOSE 3000

# Run the app
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/next start"]
