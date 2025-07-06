# Elasticsearch Setup Guide for OmniX

Elasticsearch powers the RAG (Retrieval-Augmented Generation) system in OmniX, providing advanced conversation memory and web search result storage.

## Quick Start Options

### Option 1: Disable Elasticsearch (Development)

For development, you can disable Elasticsearch entirely:

```bash
# Already added to .env.local
ELASTICSEARCH_ENABLED=false
```

The system will work without RAG features and use basic conversation context.

### Option 2: Docker Setup (Recommended)

Start Elasticsearch with Docker:

```bash
# Start Elasticsearch
./start-elasticsearch.sh

# Or manually:
docker-compose -f docker-compose.elasticsearch.yml up -d
```

This will:
- Start Elasticsearch on port 9200
- Create persistent data storage
- Disable security for local development

### Option 3: Cloud Elasticsearch

For production, use a managed service:

```bash
# Add to .env.local
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_URL=https://your-elastic-cloud-url:9243
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password
ELASTICSEARCH_TLS=true
```

## Verification

Check if Elasticsearch is running:

```bash
curl http://localhost:9200/_cluster/health
```

Expected response:
```json
{
  "cluster_name": "docker-cluster",
  "status": "green",
  "timed_out": false,
  "number_of_nodes": 1
}
```

## Features Enabled with Elasticsearch

✅ **Conversation Memory**: AI remembers context across sessions
✅ **Web Search Storage**: Cached search results for faster responses  
✅ **Semantic Search**: Find relevant past conversations
✅ **User Preferences**: Personalized AI responses based on history

## Troubleshooting

### Connection Refused Error
```
Error [ConnectionError]: connect ECONNREFUSED 127.0.0.1:9200
```

**Solutions:**
1. Start Elasticsearch: `./start-elasticsearch.sh`
2. Or disable it: Set `ELASTICSEARCH_ENABLED=false` in `.env.local`

### Memory Issues
If Elasticsearch uses too much memory:

```bash
# Edit docker-compose.elasticsearch.yml
environment:
  - "ES_JAVA_OPTS=-Xms256m -Xmx256m"  # Reduce from 512m
```

### Port Conflicts
If port 9200 is in use:

```bash
# Edit docker-compose.elasticsearch.yml
ports:
  - "9201:9200"  # Use different port

# Update .env.local
ELASTICSEARCH_URL=http://localhost:9201
```

## Management Commands

```bash
# Start Elasticsearch
./start-elasticsearch.sh

# Stop Elasticsearch
docker-compose -f docker-compose.elasticsearch.yml down

# View logs
docker-compose -f docker-compose.elasticsearch.yml logs elasticsearch

# Reset data (delete all indices)
docker-compose -f docker-compose.elasticsearch.yml down -v
```

## Production Considerations

For production deployment:

1. **Use managed Elasticsearch** (AWS OpenSearch, Elastic Cloud)
2. **Enable security** (authentication, TLS)
3. **Configure backups**
4. **Monitor cluster health**
5. **Scale based on usage**

## Environment Variables Reference

```bash
# Required
ELASTICSEARCH_ENABLED=true|false

# Optional (when enabled)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password
ELASTICSEARCH_TLS=true|false
```