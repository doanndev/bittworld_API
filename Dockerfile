# Stage 1: Build
FROM node:22-alpine AS builder

# Đặt thư mục làm việc
WORKDIR /app

# Copy package files để tận dụng Docker cache
COPY package*.json ./
COPY yarn.lock* ./

# Cài đặt tất cả dependencies (bao gồm devDependencies cho build)
RUN npm install --legacy-peer-deps || yarn install --frozen-lockfile

# Copy source code
COPY . .

# Cài đặt dependencies cho spl-token trong vendor nếu có
RUN if [ -d "vendor/spl-token-0.4.13" ]; then \
    cd vendor/spl-token-0.4.13 && npm install; \
    fi

# Build NestJS application
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

# Tạo non-root user để chạy ứng dụng (bảo mật tốt hơn)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Đặt thư mục làm việc
WORKDIR /app

# Copy package files
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Cài đặt chỉ production dependencies
RUN npm install --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy vendor directory nếu có
COPY --from=builder --chown=nestjs:nodejs /app/vendor ./vendor

# Copy public directory nếu có
COPY --from=builder --chown=nestjs:nodejs /app/public ./public

# Chuyển sang non-root user
USER nestjs

# Expose cổng (Render sẽ tự động set PORT env variable)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-8000}/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Chạy ứng dụng (sử dụng PORT từ environment variable)
CMD ["node", "dist/main.js"]