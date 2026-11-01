# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1. Build the React client
# ---------------------------------------------------------------------------
FROM node:22-alpine AS client-build

WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# 2. Install production dependencies only
# ---------------------------------------------------------------------------
FROM node:22-alpine AS server-deps

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------------------
# 3. Runtime
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Never run the app as root: a container escape should not hand over root.
RUN addgroup -S app && adduser -S -G app app

COPY --from=server-deps --chown=app:app /app/server/node_modules ./server/node_modules
COPY --chown=app:app server/ ./server/
COPY --from=client-build --chown=app:app /app/client/dist ./client/dist

# Writable state for the JSON store and uploads.
RUN mkdir -p /app/server/data /app/server/uploads \
    && chown -R app:app /app/server/data /app/server/uploads

USER app

ENV PORT=4000 \
    DATA_DIR=/app/server/data \
    UPLOADS_DIR=/app/server/uploads \
    CLIENT_DIST=/app/client/dist

EXPOSE 4000

# The platform runs this too, but having it in the image means `docker run`
# behaves the same way as production.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
