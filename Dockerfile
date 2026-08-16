# Warframe Build Agent — web chat (whole monorepo)
# Keeps data/knowledge on disk for offline pack tools (Fly / Docker / VPS).
#
# Build:  docker build -t warframe-build-agent .
# Run:    docker run --rm -p 3000:3000 \
#           -e OPENAI_API_KEY=sk-... -e OPENAI_MODEL=gpt-4o-mini \
#           -e CHAT_PASSWORD=changeme warframe-build-agent

FROM node:20-bookworm-slim AS deps
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY web ./web
COPY data/knowledge ./data/knowledge
COPY data/market ./data/market
COPY data/patches ./data/patches
WORKDIR /app/web
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Allow reading committed daily JSON under data/market|patches in production.
ENV ALLOW_LOCAL_DAILY_DATA=true

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone server (output: "standalone" in web/next.config.ts)
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./public
# Pack + daily scrapes at /app/data so local-knowledge resolves process.cwd()/data/knowledge
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
