FROM node:jod-alpine AS builder

WORKDIR /app

# better-sqlite3 native build
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:jod-alpine AS runner

LABEL org.opencontainers.image.source="https://github.com/TobiTenno/kofc-next"
LABEL org.opencontainers.image.description="Knights of Columbus Council Site"

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/app.db

RUN mkdir -p /app/data/cache/calendar

COPY --from=builder /app/dist/standalone ./

EXPOSE 3000

CMD ["node", "server.js"]
