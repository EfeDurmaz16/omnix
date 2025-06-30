# Vertex AI Vector Search Setup for OmniX

## 📋 **Optimal Configuration Settings**

### **Basic Information**
- **Display name**: `omnix-memory-index`
- **Description**: `OmniX AI chat platform vector index for RAG and user memory`
- **Region**: `us-central1` (matches your existing setup)

### **Storage Configuration**
- **GCS folder URI**: `gs://your-omnix-bucket/vector-data/`
  - Create this bucket first: `gsutil mb gs://your-omnix-bucket`
  - This stores your vector metadata and backups

### **Algorithm Settings**
- **Algorithm type**: `Tree-AH algorithm` ✅ (recommended for balanced performance)
- **Dimensions**: `1536` (matches OpenAI text-embedding-3-small)
- **Approximate neighbors count**: `50` (good balance for accuracy vs speed)

### **Update & Performance**
- **Update method**: `Batch` ✅ (efficient for conversation updates)
- **Shard size**: `Medium` ✅ (handles ~1M vectors efficiently)

## 🚀 **Setup Steps**

### 1. Create GCS Bucket
```bash
# Create bucket for vector data
gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l us-central1 gs://your-omnix-bucket

# Create vector data folder
gsutil mkdir gs://your-omnix-bucket/vector-data/
```

### 2. Enable Required APIs
```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable storage.googleapis.com
```

### 3. Create the Index (using your form settings)
Fill in the form with the values above, then create the index.

### 4. Create Index Endpoint
```bash
gcloud ai index-endpoints create \
  --display-name="omnix-memory-endpoint" \
  --description="OmniX memory retrieval endpoint" \
  --region=us-central1
```

### 5. Deploy Index to Endpoint
```bash
# Get your index ID from the console after creation
gcloud ai index-endpoints deploy-index ENDPOINT_ID \
  --index=INDEX_ID \
  --deployed-index-id=omnix-memory-deployed \
  --display-name="OmniX Memory Index" \
  --region=us-central1
```

## 🔄 **Update Your Code**

I'll create an enhanced version that uses Vector Search: 