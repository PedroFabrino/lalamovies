FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@11.25.0

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --filter @mdm/api...

COPY apps/api ./apps/api
RUN pnpm --filter @mdm/api build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm@11.25.0

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --filter @mdm/api... --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
