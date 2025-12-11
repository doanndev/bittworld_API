# Hướng dẫn Deploy Backend lên Render bằng Docker

## Yêu cầu

- Tài khoản Render (https://render.com)
- Repository code đã push lên GitHub/GitLab/Bitbucket
- Các environment variables đã được chuẩn bị

## Các bước deploy

### 1. Chuẩn bị Environment Variables

Trên Render Dashboard, bạn cần cấu hình các environment variables sau:

**Bắt buộc:**
- `NODE_ENV=production`
- `PORT=8000` (Render sẽ tự động set, nhưng có thể override)

**Database & Services:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (nếu dùng)
- `MONGODB_URI` - MongoDB connection string (nếu dùng)

**Application Config:**
- `JWT_SECRET` - Secret key cho JWT
- `URL_FRONTEND` - URL của frontend
- Và các biến môi trường khác theo `.env.example`

### 2. Deploy qua Render Dashboard

#### Option A: Sử dụng render.yaml (Khuyến nghị)

1. Đảm bảo file `render.yaml` đã có trong repository
2. Trên Render Dashboard, chọn **New** → **Blueprint**
3. Connect repository của bạn
4. Render sẽ tự động detect `render.yaml` và deploy

#### Option B: Deploy thủ công

1. Trên Render Dashboard, chọn **New** → **Web Service**
2. Connect repository của bạn
3. Cấu hình:
   - **Name**: backend (hoặc tên bạn muốn)
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.`
   - **Region**: Singapore (hoặc region gần bạn nhất)
   - **Branch**: main (hoặc branch bạn muốn deploy)
   - **Plan**: Starter (hoặc plan phù hợp)
4. Thêm các Environment Variables
5. Click **Create Web Service**

### 3. Health Check

Render sẽ tự động check health endpoint tại `/api/v1/health`. 

Nếu bạn chưa có health endpoint, có thể:
- Tạo endpoint health check trong `app.controller.ts`
- Hoặc disable health check trong Render settings

### 4. Build & Deploy

Sau khi tạo service, Render sẽ:
1. Build Docker image từ Dockerfile
2. Deploy container
3. Expose service qua URL được cung cấp

### 5. Kiểm tra Logs

- Vào **Logs** tab trên Render Dashboard để xem logs
- Nếu có lỗi, check:
  - Environment variables đã đúng chưa
  - Database/Redis connection có hoạt động không
  - Port có được expose đúng không

## Troubleshooting

### Lỗi: Cannot find module
- Kiểm tra `node_modules` đã được install đúng chưa
- Đảm bảo `vendor/spl-token-0.4.13` đã được copy vào image

### Lỗi: Port binding
- Render tự động set PORT env variable
- Đảm bảo app đọc PORT từ `process.env.PORT` hoặc `configService.get('PORT')`

### Lỗi: Database connection
- Kiểm tra DATABASE_URL đã đúng format chưa
- Đảm bảo database service đã được tạo và running
- Check firewall/network settings

### Lỗi: Build timeout
- Tăng build timeout trong Render settings
- Hoặc optimize Dockerfile để build nhanh hơn

## Tối ưu hóa

### Build Cache
Dockerfile đã được tối ưu với multi-stage build và layer caching:
- Copy `package.json` trước để cache dependencies
- Chỉ copy production dependencies vào final image

### Image Size
- Sử dụng `node:22-alpine` để giảm image size
- Chỉ copy files cần thiết vào final image
- Sử dụng `.dockerignore` để loại bỏ files không cần thiết

## Continuous Deployment

Render hỗ trợ auto-deploy khi push code:
- Vào **Settings** → **Auto-Deploy**
- Enable auto-deploy cho branch `main` (hoặc branch bạn muốn)

## Database Migrations

Để chạy migrations sau khi deploy:

1. SSH vào container (nếu Render hỗ trợ)
2. Hoặc tạo một script deploy riêng
3. Chạy: `npm run migration:run`

Hoặc có thể thêm vào Dockerfile CMD để tự động chạy migrations trước khi start app.

## Notes

- Render sẽ tự động restart service khi có lỗi
- Health check sẽ giúp Render biết service có healthy không
- Logs có thể được xem real-time trên Dashboard
- Có thể scale service lên/down tùy theo nhu cầu
