FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Variables Vite figées au build. VITE_WS_BASE est facultatif : par défaut le
# WebSocket vise l'origine de la page (/ws/…), relayée par nginx.
ARG VITE_API_BASE=/api/v1
ARG VITE_API_KEY
ARG VITE_WS_BASE
ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_API_KEY=$VITE_API_KEY \
    VITE_WS_BASE=$VITE_WS_BASE

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null || exit 1
