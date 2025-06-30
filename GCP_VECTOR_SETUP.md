# GCP Vector Store Setup Guide

## 🚀 Overview
Your OmniX platform now uses **Google Cloud's vector storage solution** instead of Pinecone. This provides better integration with your existing GCP infrastructure and is more cost-effective.

## 🏗️ Architecture
- **Primary Storage**: Firestore with embedded vectors for similarity search
- **Embedding Model**: OpenAI text-embedding-3-small (1536 dimensions)
- **Upgrade Path**: Can easily migrate to Vertex AI Vector Search for higher scale

## ⚙️ Environment Variables

Add these to your `.env.local`:

```bash
# GCP Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account.json

# Optional: For future Vertex AI Vector Search upgrade
VERTEX_AI_INDEX_ENDPOINT=

# Existing required vars
OPENAI_API_KEY=your-openai-key
```

## 🔧 GCP Services Setup

### 1. Enable Required APIs
```bash
gcloud services enable firestore.googleapis.com
gcloud services enable aiplatform.googleapis.com  # For future Vector Search
```

### 2. Create Service Account
```bash
gcloud iam service-accounts create omnix-vector-store \
  --display-name="OmniX Vector Store Service Account"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:omnix-vector-store@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud iam service-accounts keys create service-account.json \
  --iam-account=omnix-vector-store@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 3. Initialize Firestore
```bash
gcloud firestore databases create --region=us-central1
```

## 📊 Cost Comparison

| Service | Pinecone | GCP Firestore | GCP Vector Search |
|---------|----------|---------------|-------------------|
| **Storage** | $0.70/1M vectors | $0.18/GB | $0.20/1M vectors |
| **Queries** | $0.40/1M queries | $0.06/100K ops | $0.10/1M queries |
| **Monthly Est.** | $50-200 | $10-30 | $20-50 |

## 🎯 Advantages

### ✅ **Current (Firestore)**
- **Zero setup**: Works immediately with existing Firestore
- **Cost effective**: 60-80% cheaper than Pinecone
- **Integrated**: Uses your existing GCP auth and billing
- **Reliable**: Google's managed infrastructure

### ⚡ **Future (Vertex AI Vector Search)**
- **High performance**: Sub-10ms query latency
- **Massive scale**: Billions of vectors
- **Advanced features**: Hybrid search, filtering
- **ML Integration**: Direct connection to Vertex AI models

## 🔄 Migration from Pinecone

If you had existing Pinecone data:

1. **Export**: Use Pinecone's export API
2. **Transform**: Convert to GCP format
3. **Import**: Batch upload to Firestore
4. **Verify**: Test search functionality

## 🚀 Next Steps

### Immediate (Done ✅)
- [x] Basic vector storage in Firestore
- [x] Cosine similarity search
- [x] User data isolation
- [x] Memory extraction and storage

### Short-term (Optional)
- [ ] Migrate to Vertex AI Vector Search for better performance
- [ ] Add hybrid search (text + semantic)
- [ ] Implement memory clustering

### Long-term (Advanced)
- [ ] Custom embedding models with Vertex AI
- [ ] Real-time memory updates
- [ ] Cross-user knowledge graphs

## 🛠️ Monitoring & Debugging

### Check Vector Store Status
```typescript
// In your app
const vectorStore = new GCPVectorStoreManager();
console.log('Vector store initialized:', vectorStore.isInitialized());
```

### Monitor Firestore Usage
```bash
# View Firestore usage
gcloud firestore operations list

# Monitor costs
gcloud billing budgets list
```

### Debug Vector Search
The system logs all vector operations with prefixes:
- `✅` - Successful operations
- `⚠️` - Warnings (missing config, etc.)
- `❌` - Errors
- `📦` - Storage operations
- `🔍` - Search operations

## 💡 Pro Tips

1. **Batch Operations**: The system automatically batches vector uploads for efficiency
2. **Relevance Threshold**: Adjust the 0.7 similarity threshold in `searchRelevantMemories()`
3. **Memory Types**: Use the 5 memory types (preference, skill, fact, goal, context) for better organization
4. **Cost Optimization**: Consider Vertex AI Vector Search only if you need <10ms latency

Your RAG system is now fully functional with GCP! 🎉 