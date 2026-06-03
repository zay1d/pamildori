FROM node:22-bookworm-slim

WORKDIR /app

# Build toolchain for better-sqlite3 (used only if no prebuilt binary is found);
# gosu lets the entrypoint drop from root to `node` after fixing data-dir perms.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates gosu \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
# Prefer reproducible installs when a lockfile is committed; fall back to a
# plain install on first setup (before a lockfile exists).
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY tsconfig.json ./
COPY src ./src
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Make the data dir writable for the built-in `node` user. For a bind mount this
# is re-applied at runtime by the entrypoint (host dirs are usually root-owned).
RUN mkdir -p /app/data && chown -R node:node /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data
EXPOSE 8080

# Start as root only so the entrypoint can chown the data dir, then it drops to
# the unprivileged `node` user (gosu) before running the app.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "--experimental-strip-types", "src/server.ts"]
