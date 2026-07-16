# Build stage — cache npm theo package-lock; chỉ rebuild khi đổi source
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
# Layer nặng nhất (~2–4 phút) — cache nếu package-lock không đổi
RUN npm ci

COPY . .
# prisma generate chạy trong postinstall + build script
RUN npm run build
RUN npm prune --omit=dev

# Production — copy node_modules đã prune, không npm ci lại
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main.js"]
