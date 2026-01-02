#!/bin/bash

# Script để build và push Docker image lên Docker Hub
# Usage: ./build-and-push.sh [version]
# Example: ./build-and-push.sh v1.0.0

set -e

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kiểm tra Docker đang chạy
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker không đang chạy. Vui lòng start Docker trước.${NC}"
    exit 1
fi

# Lấy thông tin từ user
read -p "Docker Hub username: " DOCKER_USERNAME
read -p "Docker Hub repository name (default: bittworld_api): " REPO_NAME
REPO_NAME=${REPO_NAME:-bittworld_api}

# Lấy version hoặc dùng default
VERSION=${1:-latest}
IMAGE_NAME="${DOCKER_USERNAME}/${REPO_NAME}"

echo -e "${YELLOW}📦 Building Docker image: ${IMAGE_NAME}:${VERSION}${NC}"

# Build image (chú ý có dấu . ở cuối để chỉ định build context)
docker build -t "${IMAGE_NAME}:${VERSION}" .

# Tag as latest nếu không phải latest
if [ "$VERSION" != "latest" ]; then
    docker tag "${IMAGE_NAME}:${VERSION}" "${IMAGE_NAME}:latest"
    echo -e "${GREEN}✅ Tagged as latest${NC}"
fi

echo -e "${YELLOW}🔐 Logging in to Docker Hub...${NC}"
docker login -u "${DOCKER_USERNAME}"

echo -e "${YELLOW}📤 Pushing ${IMAGE_NAME}:${VERSION} to Docker Hub...${NC}"
docker push "${IMAGE_NAME}:${VERSION}"

if [ "$VERSION" != "latest" ]; then
    echo -e "${YELLOW}📤 Pushing ${IMAGE_NAME}:latest to Docker Hub...${NC}"
    docker push "${IMAGE_NAME}:latest"
fi

echo -e "${GREEN}✅ Successfully pushed ${IMAGE_NAME}:${VERSION} to Docker Hub!${NC}"
echo -e "${GREEN}✅ Image URL: docker.io/${IMAGE_NAME}:${VERSION}${NC}"
