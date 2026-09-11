FROM node:22-bookworm AS builder

WORKDIR /app

ENV npm_config_nodedir=/usr/local

RUN npm install -g pnpm@11.25.0

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/watcher/package.json ./apps/watcher/

RUN pnpm install --filter @mdm/watcher...

COPY apps/watcher ./apps/watcher
RUN pnpm --filter @mdm/watcher build

FROM node:22-bookworm AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/watcher/package.json ./apps/watcher/

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/watcher/node_modules ./apps/watcher/node_modules
COPY --from=builder /app/apps/watcher/dist ./apps/watcher/dist

EXPOSE 3001

CMD ["node", "apps/watcher/dist/index.js"]
