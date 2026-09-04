# Production readiness audit finding A11: no deployment manifest existed
# for the API at all. Multi-stage build so the final image doesn't carry
# devDependencies, build tools, or the test suite -- only what's needed
# to run the server.

FROM node:20-alpine AS base
WORKDIR /app

# --- deps: install once, cached across builds unless package*.json changes
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runtime image
FROM base AS runtime
ENV NODE_ENV=production

# Run as a non-root user -- the default `node` user/group already exists
# in the official image.
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

USER node

EXPOSE 4000

# Container-level health check, backed by the same /health endpoint a
# load balancer/orchestrator would use (see src/utils/healthCheck.js) --
# `docker ps` and `docker compose` can both use this without any
# additional infrastructure config.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
