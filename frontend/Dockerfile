# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# 🚀 優化: 使用官方 npm 鏡像（Self SDK 在官方源）
RUN npm config set registry https://registry.npmjs.org

# 🚀 優化: 先複製 package files,利用 Docker 層緩存
COPY package*.json ./

# 🚀 優化: 使用 --mount=type=cache 加速 npm 安裝
# 設置更長的超時時間和並發連接數
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-timeout 600000 && \
    npm config set maxsockets 5 && \
    npm install --prefer-offline --no-audit

# 複製原始碼
COPY . .

# 建置應用
RUN npm run build

# Production stage
FROM nginx:alpine

# 🚀 優化: 更換 Alpine 鏡像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安裝 wget (用於健康檢查)
RUN apk add --no-cache wget

# 複製自定義 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 從 builder 複製建置結果
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露 port 5004
EXPOSE 5004

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]
