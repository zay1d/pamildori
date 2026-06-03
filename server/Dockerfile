FROM node:22-bookworm-slim

WORKDIR /app

# Build toolchain for better-sqlite3 (used only if no prebuilt binary is found).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
# Prefer reproducible installs when a lockfile is committed; fall back to a
# plain install on first setup (before a lockfile exists).
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY tsconfig.json ./
COPY src ./src

# Run as the unprivileged built-in `node` user; ensure the data dir is writable.
RUN mkdir -p /app/data && chown -R node:node /app
USER node

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data
EXPOSE 8080

CMD ["node", "--experimental-strip-types", "src/server.ts"]
