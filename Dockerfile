FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV DATABASE_URL=file:/tmp/build.db
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm db:generate && pnpm build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# Maintenance imports use Prisma CLI and TypeScript, so retain these dependencies.
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/data/companion.db
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD ["node", "scripts/docker-healthcheck.mjs"]
ENTRYPOINT ["node", "scripts/docker-entrypoint.mjs"]
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
