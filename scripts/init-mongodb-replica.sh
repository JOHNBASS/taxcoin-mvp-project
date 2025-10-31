#!/bin/bash
# MongoDB Replica Set 初始化腳本
# 此腳本用於在 Docker Compose 啟動後初始化 MongoDB replica set

set -e

echo "🔄 等待 MongoDB 啟動..."
sleep 10

echo "🔧 初始化 MongoDB Replica Set..."
docker exec taxcoin-mongodb mongosh --quiet --eval '
try {
  const status = rs.status();
  print("✅ Replica Set 已經初始化");
  printjson(status);
} catch (err) {
  if (err.codeName === "NotYetInitialized") {
    print("🚀 正在初始化 Replica Set...");
    const result = rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongodb:27017" }
      ]
    });
    printjson(result);
    print("✅ Replica Set 初始化完成");
  } else {
    print("❌ 錯誤:", err.message);
    throw err;
  }
}
'

echo "⏳ 等待 Replica Set 準備就緒..."
sleep 5

echo "🔍 檢查 Replica Set 狀態..."
docker exec taxcoin-mongodb mongosh --quiet --eval 'rs.status().members.forEach(m => print(m.name, "->", m.stateStr))'

echo "✅ MongoDB Replica Set 已就緒"
