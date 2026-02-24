FROM node:20-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @rss-reader/shared build
RUN pnpm --filter rss-reader-web build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
# Copy the template file to the templates directory
# Nginx will automatically substitute environment variables and output to /etc/nginx/conf.d/default.conf
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
