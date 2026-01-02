# Hướng dẫn Deploy Backend lên Render từ Docker Hub

## Tổng quan

Thay vì push code lên GitHub, bạn sẽ:
1. Build Docker image từ code local
2. Push image lên Docker Hub
3. Cấu hình Render để pull và deploy từ Docker Hub

## Yêu cầu

- Docker đã cài đặt và đang chạy
- Tài khoản Docker Hub (https://hub.docker.com)
- Tài khoản Render (https://render.com)

## Các bước thực hiện

### 1. Tạo tài khoản và repository trên Docker Hub

1. Đăng ký/đăng nhập tại https://hub.docker.com
2. Tạo repository mới (ví dụ: `backend` hoặc `your-username/backend`)
3. Lưu lại tên repository (sẽ dùng format: `username/repository-name`)

### 2. Build và Push Docker Image

#### Cách 1: Sử dụng script tự động (Khuyến nghị)

```bash
# Cấp quyền thực thi
chmod +x build-and-push.sh

# Chạy script
./build-and-push.sh [version]

# Ví dụ:
./build-and-push.sh v1.0.0
# hoặc
./build-and-push.sh latest
```

Script sẽ hỏi:
- Docker Hub username
- Repository name (mặc định: backend)
- Tự động build, tag và push image

#### Cách 2: Thực hiện thủ công

```bash
# 1. Login vào Docker Hub
docker login

# 2. Build image (thay YOUR_USERNAME và REPO_NAME)
docker build -t YOUR_USERNAME/REPO_NAME:latest .

# 3. Push lên Docker Hub
docker push YOUR_USERNAME/REPO_NAME:latest

# Ví dụ:
docker build -t doanndev/backend:latest .
docker push doanndev/backend:latest
```

### 3. Cấu hình Render để Deploy từ Docker Hub

#### Option A: Sử dụng Render Dashboard

1. Đăng nhập vào Render Dashboard
2. Chọn **New** → **Web Service**
3. Chọn tab **Public Docker Image** (thay vì Git Repository)
4. Nhập thông tin:
   - **Docker Image URL**: `docker.io/YOUR_USERNAME/REPO_NAME:latest`
     - Ví dụ: `docker.io/doanndev/backend:latest`
   - **Name**: backend (hoặc tên bạn muốn)
   - **Region**: Singapore (hoặc region gần bạn)
   - **Plan**: Starter (hoặc plan phù hợp)
5. Thêm Environment Variables:
   - `NODE_ENV=production`
   - `PORT=8000` (Render sẽ tự động set, nhưng có thể override)
   - `DATABASE_URL=...`
   - `REDIS_URL=...`
   - Và các biến môi trường khác
6. Click **Create Web Service**

#### Option B: Sử dụng Render API (Nâng cao)

Nếu bạn muốn tự động hóa, có thể dùng Render API để tạo service.

### 4. Cấu hình Auto-Deploy (Tùy chọn)

Render không tự động pull image mới từ Docker Hub. Bạn có 2 options:

#### Option 1: Manual Deploy
- Mỗi khi push image mới, vào Render Dashboard và click **Manual Deploy**
- Chọn version/tag mới nếu có

#### Option 2: Webhook Auto-Deploy
1. Tạo webhook trên Docker Hub để trigger khi push image mới
2. Cấu hình webhook gọi Render API để trigger deploy

### 5. Update Image mới

Khi có code mới:

```bash
# 1. Build và push image mới
./build-and-push.sh v1.0.1

# 2. Vào Render Dashboard → Manual Deploy
# Hoặc sử dụng Render API để trigger deploy
```

## Cấu hình nâng cao

### Sử dụng Version Tags

Thay vì dùng `latest`, nên dùng version tags:

```bash
# Build với version
./build-and-push.sh v1.0.0
./build-and-push.sh v1.0.1

# Trên Render, có thể chỉ định version cụ thể:
docker.io/YOUR_USERNAME/REPO_NAME:v1.0.0
```

### Private Docker Hub Repository

Nếu repository là private:

1. Trên Render Dashboard, vào **Environment** tab
2. Thêm Docker credentials:
   - `DOCKER_USERNAME`: username của bạn
   - `DOCKER_PASSWORD`: password hoặc access token
3. Render sẽ tự động authenticate khi pull image

### Health Check

Render sẽ tự động check health endpoint tại `/api/v1/health` (đã được thêm trong app.controller.ts).

## Troubleshooting

### Lỗi: Cannot pull image
- Kiểm tra image URL đã đúng chưa
- Nếu là private repo, đảm bảo đã thêm Docker credentials trên Render
- Kiểm tra image đã được push thành công lên Docker Hub

### Lỗi: Image not found
- Kiểm tra tên image: `docker.io/username/repo:tag`
- Đảm bảo đã push image với tag tương ứng
- Kiểm tra repository là public hoặc đã authenticate

### Lỗi: Build failed
- Kiểm tra Dockerfile có đúng không
- Test build local trước: `docker build -t test .`
- Xem logs trên Render để biết lỗi cụ thể

### Update không được apply
- Render không tự động pull image mới
- Phải manual deploy hoặc dùng webhook
- Đảm bảo đã push image mới với tag đúng

## So sánh với Git-based Deployment

| Git-based | Docker Hub-based |
|-----------|-----------------|
| ✅ Auto-deploy khi push code | ❌ Phải manual deploy |
| ✅ Render tự động build | ✅ Build local, push lên Hub |
| ✅ Code được version control | ❌ Code không trên Git |
| ❌ Phải public code | ✅ Code không cần public |
| ❌ Build time trên Render | ✅ Build nhanh hơn (pre-built) |

## Best Practices

1. **Versioning**: Luôn dùng version tags thay vì `latest` cho production
2. **Security**: Nếu code nhạy cảm, dùng private Docker Hub repo
3. **Testing**: Test build local trước khi push: `docker build -t test . && docker run -p 8000:8000 test`
4. **CI/CD**: Có thể setup GitHub Actions để tự động build và push khi có code mới (nếu sau này muốn dùng Git)

## Scripts hữu ích

### Build và test local

```bash
# Build
docker build -t backend:local .

# Run local để test
docker run -p 8000:8000 --env-file .env backend:local
```

### Xem image size

```bash
docker images | grep YOUR_USERNAME/REPO_NAME
```

### Xóa image cũ

```bash
docker rmi YOUR_USERNAME/REPO_NAME:old-version
```
