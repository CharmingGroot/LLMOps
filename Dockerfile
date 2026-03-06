FROM node:20-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install Python for pipeline modules
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/state/package.json packages/state/
COPY packages/orchestrator/package.json packages/orchestrator/
COPY packages/cli/package.json packages/cli/
COPY packages/dashboard-api/package.json packages/dashboard-api/
COPY packages/dashboard-ui/package.json packages/dashboard-ui/
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY tsconfig.json ./
COPY packages/ packages/
RUN pnpm build

# ---------- api ----------
FROM base AS api
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/packages/*/node_modules packages/
COPY --from=build /app/packages packages
COPY modules/ modules/
COPY config/ config/

EXPOSE 4000
ENV PORT=4000
ENV MLFLOW_TRACKING_URI=http://mlflow:5000

CMD ["node", "packages/dashboard-api/dist/server.js"]

# ---------- cli ----------
FROM base AS cli
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/packages/*/node_modules packages/
COPY --from=build /app/packages packages
COPY modules/ modules/
COPY config/ config/

ENTRYPOINT ["node", "packages/cli/dist/index.js"]
