# Ejemplo. Las NEXT_PUBLIC_* quedan escritas en el build, así que entran como
# argumentos; el resto de las variables se pasan al arrancar el contenedor.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_TELEMETRY_DISABLED=1
# Para compilar no hace falta una base ni un secreto real.
RUN NEXT_STANDALONE=1 MODO_DEMO=1 JWT_SECRET=solo-para-compilar-no-se-usa-en-ningun-sitio npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# Memoria acotada para un VPS de 1 GB con Mongo al lado: el heap no pasa de ~170 MB
# en carga, y lo que crece es memoria nativa. MALLOC_ARENA_MAX sólo actúa con glibc
# (pm2 en el VPS); aquí es Alpine y no estorba. Medidas en docs/rendimiento.md.
ENV NODE_OPTIONS=--max-old-space-size=256 MALLOC_ARENA_MAX=2
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
# Con ?db=1 también comprueba Mongo; aquí basta con que el proceso responda.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
