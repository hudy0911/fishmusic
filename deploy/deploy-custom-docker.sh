#!/usr/bin/env bash
set -e

PROJECT_DIR="/thome/1panel/cong/music/fishmusic"

cd "$PROJECT_DIR"

echo "[1/4] 拉取最新代码"
git pull origin main

echo "[2/4] 构建 Docker 镜像"
docker build -t fishmusic:custom .

echo "[3/4] 移除旧容器"
docker rm -f fishmusic 2>/dev/null || true

echo "[4/4] 启动新容器"
docker run -d \
  --name fishmusic \
  --restart unless-stopped \
  -p 4000:4000 \
  --env-file /thome/1panel/cong/music/fishmusic/.env.production \
  -v /thome/1panel/cong/music/fishmusic/data/.env:/app/server/.env \
  -v /thome/1panel/cong/music/fishmusic/data/runtimeConfig.json:/app/server/runtimeConfig.json \
  -v /thome/1panel/cong/music/fishmusic/data/adminConfig.json:/app/server/adminConfig.json \
  -v /thome/1panel/cong/music/fishmusic/data/setup.lock:/app/server/setup.lock \
  -v /thome/1panel/cong/music/fishmusic/data/downloads:/app/server/downloads \
  fishmusic:custom

echo "部署完成：http://服务器IP:4000"
