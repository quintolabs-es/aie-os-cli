FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN pnpm compile

FROM node:22-alpine

WORKDIR /workspace

COPY --from=build /app/dist /opt/aie-os/dist

ENTRYPOINT ["node", "/opt/aie-os/dist/index.js"]
