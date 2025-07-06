# Chroma Vector Database Setup for OmniX

Chroma is a lightweight, fast vector database perfect for RAG (Retrieval-Augmented Generation) applications. It's much simpler than Elasticsearch and designed specifically for LLM applications.

## Why Chroma?

✅ **Built for LLMs** - Native support for embeddings and vector search
✅ **Super Simple** - Single command setup, no complex configuration  
✅ **Fast** - Optimized for similarity search and retrieval
✅ **Free** - Completely open source with no licensing costs
✅ **Lightweight** - Much lower resource usage than Elasticsearch

## Quick Start

### Option 1: Start Chroma with Docker (Recommended)

```bash
# Start Chroma (handles Docker setup automatically)
./start-chroma.sh
```

This will:
- Start Chroma on port 8000
- Create persistent storage for your vectors
- Set up the database ready for OmniX

### Option 2: Manual Docker Setup

```bash
# Start Chroma manually
docker-compose -f docker-compose.chroma.yml up -d

# Check if it's running
curl http://localhost:8000/api/v1/heartbeat
```

### Option 3: Python Local Install (Development)

```bash
# Install Chroma locally (optional)
pip install chromadb

# Start local server
chroma run --host localhost --port 8000
```

## Verification

Test if Chroma is working:

```bash
curl http://localhost:8000/api/v1/heartbeat
```

Expected response:
```json
{
  "nanosecond heartbeat": 1234567890
}
```

## Features Enabled with Chroma

✅ **Conversation Memory** - AI remembers context across sessions
✅ **Semantic Search** - Find relevant past conversations  
✅ **Web Search Storage** - Cached search results for faster responses
✅ **User Preferences** - Personalized AI responses based on history
✅ **Memory Extraction** - Automatically extract facts and preferences

## Configuration

The system is pre-configured with optimal settings:

```bash
# Environment variables (already in .env.local)
CHROMA_ENABLED=true
CHROMA_URL=http://localhost:8000
```

## Performance Comparison

| Feature | Elasticsearch | Chroma |
|---------|---------------|--------|
| Setup Time | 15+ minutes | 30 seconds |
| Memory Usage | 2-4 GB | 100-500 MB |
| Indexing Speed | Slow | Fast |
| Vector Search | Good | Excellent |
| LLM Integration | Complex | Native |
| Cost | Expensive | Free |

## Management Commands

```bash
# Start Chroma
./start-chroma.sh

# Stop Chroma
docker-compose -f docker-compose.chroma.yml down

# View logs
docker-compose -f docker-compose.chroma.yml logs chroma

# Reset all data (clear collections)
docker-compose -f docker-compose.chroma.yml down -v

# Restart with fresh data
docker-compose -f docker-compose.chroma.yml up -d
```

## Troubleshooting

### Port 8000 Already in Use
```bash
# Check what's using port 8000
lsof -i :8000

# Or use different port in docker-compose.chroma.yml
ports:
  - "8001:8000"

# Update .env.local
CHROMA_URL=http://localhost:8001
```

### Docker Issues
```bash
# Check Docker status
docker ps

# Restart Docker (WSL2)
sudo service docker restart

# Check Chroma container
docker logs omnix-chroma
```

### Connection Errors
1. **Ensure Chroma is running**: `./start-chroma.sh`
2. **Check firewall**: Allow port 8000
3. **Test connection**: `curl http://localhost:8000/api/v1/heartbeat`

## Production Deployment

For production, consider:

1. **Chroma Cloud** (Managed service coming soon)
2. **Self-hosted with persistent volumes**
3. **Load balancing** for high availability
4. **Backup strategies** for vector collections

## Environment Variables Reference

```bash
# Required
CHROMA_ENABLED=true|false

# Optional
CHROMA_URL=http://localhost:8000        # Default: http://localhost:8000
OPENAI_API_KEY=your_openai_key         # Required for embeddings
```

## API Endpoints

Once running, Chroma provides:

- `GET /api/v1/heartbeat` - Health check
- `GET /api/v1/collections` - List collections  
- `POST /api/v1/collections` - Create collection
- OmniX automatically manages collections for you

## Migration from Elasticsearch

If migrating from Elasticsearch:

1. **Start Chroma**: `./start-chroma.sh`
2. **Update config**: Set `CHROMA_ENABLED=true`
3. **Restart app**: Your conversations will start building new vector memories
4. **Clean up**: Old Elasticsearch data remains separate

No data migration needed - the system will build new memories as you chat!

## Support

- **Chroma Docs**: https://docs.trychroma.com/
- **GitHub Issues**: https://github.com/chroma-core/chroma/issues
- **Discord**: https://discord.gg/MMeYNTmh3x