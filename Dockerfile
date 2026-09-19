FROM node:20-bookworm-slim AS build

WORKDIR /app

ENV CI=1
ENV EXPO_NO_TELEMETRY=1
ENV NODE_OPTIONS=--max-old-space-size=4096

ARG EXPO_PUBLIC_USE_MOCK_API=true
ARG EXPO_PUBLIC_API_URL=
ENV EXPO_PUBLIC_USE_MOCK_API=$EXPO_PUBLIC_USE_MOCK_API
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx expo export -p web

FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV PORT=8080
ENV NGINX_ENVSUBST_FILTER=^PORT$

EXPOSE 8080
