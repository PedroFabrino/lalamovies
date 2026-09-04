FROM node:22-bookworm AS builder

WORKDIR /app

ENV npm_config_nodedir=/usr/local

RUN npm install -g pnpm@11.25.0

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --filter @mdm/api...

COPY apps/api ./apps/api
RUN pnpm --filter @mdm/api build

FROM node:22-bookworm AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
