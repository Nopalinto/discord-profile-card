# Background worker: Lanyard -> Redis sync
# This image intentionally does NOT build the Next.js app. It only needs
# the two runtime deps the worker uses (redis, ws), which makes builds fast
# and avoids the Nixpacks/Next.js build-image failures entirely.

FROM node:20-alpine

WORKDIR /app

# Install only what the worker needs (build context is the worker/ directory).
COPY package.json ./package.json
RUN npm install --omit=dev

# Copy the worker source.
COPY lanyard-redis-sync.mjs ./lanyard-redis-sync.mjs

ENV NODE_ENV=production

# REDIS_URL (or KV_URL) must be provided via Railway Variables.
CMD ["node", "lanyard-redis-sync.mjs"]
