FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE=/api/v1
ARG VITE_API_KEY
ARG VITE_WS_BASE
ARG VITE_BACKEND_URL
ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_API_KEY=$VITE_API_KEY \
    VITE_WS_BASE=$VITE_WS_BASE \
    VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null || exit 1
