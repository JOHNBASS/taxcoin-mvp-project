#!/bin/bash
# MongoDB Replica Set 初始化腳本

# 使用正確的 Docker 路徑
DOCKER_CMD="/Applications/Docker.app/Contents/Resources/bin/docker"
if [ ! -f "$DOCKER_CMD" ]; then
  DOCKER_CMD="docker"
fi

echo "⏳ 等待 MongoDB 啟動..."
sleep 5

echo "🔧 初始化 MongoDB Replica Set..."
$DOCKER_CMD exec taxcoin-mongodb mongosh --eval '
try {
  rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "mongodb:27017" }]
  })
} catch(e) {
  if (e.codeName === "AlreadyInitialized") {
    print("Replica set already initialized, reconfiguring hostname...");
    var cfg = rs.conf();
    if (cfg.members[0].host !== "mongodb:27017") {
      cfg.members[0].host = "mongodb:27017";
      rs.reconfig(cfg);
      print("Hostname reconfigured to mongodb:27017");
    } else {
      print("Hostname already correct");
    }
  } else {
    throw e;
  }
}
'

echo "✅ MongoDB Replica Set 初始化完成"
echo "ℹ️  請執行 'docker-compose restart backend' 重啟後端服務"
