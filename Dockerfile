# Container image for the Next.js site in `app/`.
#
# `next.config.ts` already sets `output: "standalone"`, so the runtime image only
# needs the traced server bundle — no node_modules, no build toolchain.
#
#   docker build -t travelboard .
#   docker run --rm -p 3000:3000 --env-file app/.env.local travelboard
#
# Build-time variables (NEXT_PUBLIC_*) must be present during `docker build`,
# because Next inlines them. Runtime-only variables (PB_URL,
# TRAVELPAYOUTS_MARKER, ...) are read at request time and can be passed at run.

FROM node:22-alpine AS deps
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY app/ ./
# Next reads .env files at build time; .dockerignore keeps the real one out of the
# image, so public config is passed explicitly here.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]