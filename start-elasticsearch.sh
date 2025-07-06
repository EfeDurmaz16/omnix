#!/bin/bash

echo "🚀 Starting Elasticsearch for OmniX..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start Elasticsearch
docker-compose -f docker-compose.elasticsearch.yml up -d

echo "⏳ Waiting for Elasticsearch to be ready..."
sleep 10

# Check if Elasticsearch is responding
for i in {1..30}; do
    if curl -s http://localhost:9200/_cluster/health > /dev/null; then
        echo "✅ Elasticsearch is ready!"
        echo "🌐 Access Elasticsearch at: http://localhost:9200"
        echo "📊 Cluster health:"
        curl -s http://localhost:9200/_cluster/health | jq .
        exit 0
    fi
    echo "⏳ Waiting... ($i/30)"
    sleep 2
done

echo "❌ Elasticsearch failed to start within 60 seconds"
echo "📋 Checking logs:"
docker-compose -f docker-compose.elasticsearch.yml logs elasticsearch
exit 1