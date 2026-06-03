#!/bin/sh
# Fix ownership of the (possibly bind-mounted, host-owned) data dir, then drop
# to the unprivileged `node` user. A bind mount like ./data:/app/data shadows
# the image dir with the host path, which is usually root-owned — so the in-image
# chown can't help and the app (uid 1000) can't create the SQLite DB. We do it at
# runtime instead. Idempotent: a no-op once perms are already correct.
set -e

if [ "$(id -u)" = "0" ]; then
  DATA="${DATA_DIR:-/app/data}"
  mkdir -p "$DATA"
  chown -R node:node "$DATA"
  # Re-exec the app as `node`. gosu forwards signals, so graceful SIGTERM works.
  exec gosu node "$@"
fi

# Already non-root (e.g. a named volume that inherited image ownership): just run.
exec "$@"
