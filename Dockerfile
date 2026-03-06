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
COPY packages/core/package.json packages/core/package.json
COPY packages/state/package.json packages/state/package.json
COPY packages/orchestrator/package.json packages/orchestrator/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/dashboard-api/package.json packages/dashboard-api/package.json
COPY packages/dashboard-ui/package.json packages/dashboard-ui/package.json
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY tsconfig.json ./
COPY packages/core/src/ packages/core/src/
COPY packages/core/tsconfig.json packages/core/tsconfig.json
COPY packages/state/src/ packages/state/src/
COPY packages/state/tsconfig.json packages/state/tsconfig.json
COPY packages/orchestrator/src/ packages/orchestrator/src/
COPY packages/orchestrator/tsconfig.json packages/orchestrator/tsconfig.json
COPY packages/cli/src/ packages/cli/src/
COPY packages/cli/tsconfig.json packages/cli/tsconfig.json
COPY packages/dashboard-api/src/ packages/dashboard-api/src/
COPY packages/dashboard-api/tsconfig.json packages/dashboard-api/tsconfig.json
COPY packages/dashboard-ui/src/ packages/dashboard-ui/src/
COPY packages/dashboard-ui/tsconfig.json packages/dashboard-ui/tsconfig.json
COPY packages/dashboard-ui/vite.config.ts packages/dashboard-ui/vite.config.ts
COPY packages/dashboard-ui/index.html packages/dashboard-ui/index.html
RUN pnpm build

# ---------- api ----------
FROM deps AS api

COPY --from=build /app/packages/core/dist/ packages/core/dist/
COPY --from=build /app/packages/state/dist/ packages/state/dist/
COPY --from=build /app/packages/orchestrator/dist/ packages/orchestrator/dist/
COPY --from=build /app/packages/dashboard-api/dist/ packages/dashboard-api/dist/

COPY modules/ modules/
COPY config/ config/

EXPOSE 4000
ENV PORT=4000
ENV MLFLOW_TRACKING_URI=http://mlflow:5000

CMD ["node", "packages/dashboard-api/dist/server.js"]

# ---------- cli ----------
FROM deps AS cli

COPY --from=build /app/packages/core/dist/ packages/core/dist/
COPY --from=build /app/packages/state/dist/ packages/state/dist/
COPY --from=build /app/packages/orchestrator/dist/ packages/orchestrator/dist/
COPY --from=build /app/packages/cli/dist/ packages/cli/dist/

COPY modules/ modules/
COPY config/ config/

ENTRYPOINT ["node", "packages/cli/dist/index.js"]

# ---------- dashboard-ui ----------
FROM nginx:alpine AS dashboard-ui

COPY --from=build /app/packages/dashboard-ui/dist/ /usr/share/nginx/html/
COPY packages/dashboard-ui/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
