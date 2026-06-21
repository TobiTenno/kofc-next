FROM node:22-alpine AS builder

WORKDIR /app

# better-sqlite3 native build
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN cp src/data/council.json.example src/data/council.json \
  && npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/app.db

RUN mkdir -p /app/data/cache/calendar

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
