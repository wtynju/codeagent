# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npx tsc

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY codeagent.config.json ./

ENTRYPOINT ["node", "dist/cli/index.js"]
CMD ["help"]