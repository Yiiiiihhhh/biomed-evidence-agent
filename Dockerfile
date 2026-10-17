FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.25.0 --no-audit --no-fund
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=7860 HOST=0.0.0.0 DATA_DIR=/mnt/workspace/biomed
COPY --from=build /app/dist ./dist
RUN mkdir -p /mnt/workspace/biomed && chown -R node:node /mnt/workspace
USER node
EXPOSE 7860
CMD ["node", "dist/server.mjs"]
