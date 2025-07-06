#!/bin/bash

echo "🚀 Starting Chroma Vector Database for OmniX..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    echo ""
    echo "For Windows/WSL2:"
    echo "1. Install Docker Desktop for Windows"
    echo "2. Enable WSL2 integration in Docker Desktop settings"
    echo "3. Or install Docker directly in WSL2:"
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "   sudo sh get-docker.sh"
    echo "   sudo service docker start"
    exit 1
fi

# Start Chroma
echo "📦 Starting Chroma container..."
docker-compose -f docker-compose.chroma.yml up -d

echo "⏳ Waiting for Chroma to be ready..."
sleep 5

# Check if Chroma is responding
for i in {1..30}; do
    if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null; then
        echo "✅ Chroma is ready!"
        echo "🌐 Access Chroma at: http://localhost:8000"
        echo "📊 Heartbeat check:"
        curl -s http://localhost:8000/api/v1/heartbeat | jq . || echo "Chroma is running (jq not installed)"
        echo ""
        echo "🎯 Next steps:"
        echo "1. Chroma is now running and ready for OmniX"
        echo "2. Start your development server: npm run dev"
        echo "3. RAG features are now fully enabled!"
        exit 0
    fi
    echo "⏳ Waiting... ($i/30)"
    sleep 2
done

echo "❌ Chroma failed to start within 60 seconds"
echo "📋 Checking logs:"
docker-compose -f docker-compose.chroma.yml logs chroma
exit 1