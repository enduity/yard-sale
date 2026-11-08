import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';
import { getDatabaseUrl } from './prisma/databaseUrl';

if (existsSync('.env')) loadEnvFile('.env');

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: { path: 'prisma/migrations' },
    datasource: { url: getDatabaseUrl() },
});
