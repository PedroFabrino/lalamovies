FROM node:22-bookworm AS builder

WORKDIR /app

ENV npm_config_nodedir=/usr/local

RUN npm install -g pnpm@11.25.0

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/streamer/package.json ./apps/streamer/

RUN pnpm install --filter @mdm/streamer...

COPY apps/streamer ./apps/streamer
RUN pnpm --filter @mdm/streamer build

FROM node:22-bookworm AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/streamer/package.json ./apps/streamer/

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/streamer/node_modules ./apps/streamer/node_modules
COPY --from=builder /app/apps/streamer/dist ./apps/streamer/dist

EXPOSE 3002

CMD ["node", "apps/streamer/dist/index.js"]
