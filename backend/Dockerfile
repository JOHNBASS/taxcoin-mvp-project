# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# 更換 Alpine 鏡像源為阿里雲
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安裝 OpenSSL 和其他必要依賴 (Prisma 需要)
RUN apk add --no-cache openssl libc6-compat

# 🚀 優化: 使用官方 npm 鏡像（Self SDK 在官方源）
RUN npm config set registry https://registry.npmjs.org

# 🚀 優化: 先複製 package files,利用 Docker 層緩存
COPY package*.json ./
COPY tsconfig.json ./

# 🚀 優化: 使用 --mount=type=cache 加速 npm 安裝
# 設置更長的超時時間和並發連接數
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-timeout 600000 && \
    npm config set maxsockets 5 && \
    npm install --prefer-offline --no-audit

# 複製原始碼
COPY src ./src
COPY prisma ./prisma

# 生成 Prisma Client
RUN npx prisma generate

# 編譯 TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# 更換 Alpine 鏡像源為阿里雲 (提高中國境內訪問速度)
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安裝 OpenSSL、wget 和其他必要依賴 (Prisma 需要)
RUN apk add --no-cache openssl libc6-compat wget

# 🚀 優化: 使用官方 npm 鏡像（Self SDK 在官方源）
RUN npm config set registry https://registry.npmjs.org

# 複製 package files
COPY package*.json ./

# 🚀 優化: 使用 cache mount 加速生產依賴安裝
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-timeout 600000 && \
    npm config set maxsockets 5 && \
    npm install --only=production --prefer-offline --no-audit

# 從 builder 複製編譯後的檔案
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 複製 prisma schema (用於 migration)
COPY prisma ./prisma

# 創建上傳和日誌目錄
RUN mkdir -p /app/uploads /app/logs && \
    chown -R node:node /app

# 使用非 root 使用者
USER node

# 暴露 port (僅內部使用,不對外)
EXPOSE 3000

# 啟動指令 (MongoDB 不需要 migration)
CMD ["node", "dist/server.js"]
