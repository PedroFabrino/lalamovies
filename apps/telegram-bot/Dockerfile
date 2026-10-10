FROM node:22-bookworm AS builder

WORKDIR /app

RUN npm install -g pnpm@11.25.0

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/telegram-bot/package.json ./apps/telegram-bot/

RUN pnpm install --filter @mdm/telegram-bot...

COPY apps/telegram-bot ./apps/telegram-bot
RUN pnpm --filter @mdm/telegram-bot build

FROM node:22-bookworm AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/telegram-bot/package.json ./apps/telegram-bot/

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/telegram-bot/node_modules ./apps/telegram-bot/node_modules
COPY --from=builder /app/apps/telegram-bot/dist ./apps/telegram-bot/dist

CMD ["node", "apps/telegram-bot/dist/index.js"]
