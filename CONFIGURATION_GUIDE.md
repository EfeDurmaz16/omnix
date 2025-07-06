# 🚀 **OmniX Configuration Guide - 100+ AI Models Setup**

## 📋 **Overview**

This guide will help you configure OmniX to access 100+ AI models through multiple providers, enable advanced RAG capabilities, and set up web search integration. Follow these steps to unlock the full potential of your AI platform.

---

## 🔑 **API Keys & Environment Variables**

### **Core Environment Setup**

Create a `.env.local` file in your project root with the following variables:

```bash
# ===== EXISTING PROVIDERS =====

# OpenAI (Required - Primary provider)
OPENAI_API_KEY=sk-your-openai-key-here

# Claude/Anthropic (Optional - High-quality models)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Google Vertex AI (Optional - Gemini models)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1

# Wavespeed (Optional - Video generation)
WAVESPEED_API_KEY=your-wavespeed-key

# ===== NEW PROVIDERS (High Impact) =====

# OpenRouter (CRITICAL - 400+ models access)
OPENROUTER_API_KEY=sk-or-your-openrouter-key
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Replicate (Important - Specialized models)
REPLICATE_API_TOKEN=r8_your-replicate-token

# ===== RAG SYSTEM =====

# Elasticsearch (Required for RAG)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-elastic-password
ELASTICSEARCH_TLS=false

# ===== WEB SEARCH =====

# Firecrawl (Required for web search)
FIRECRAWL_API_KEY=fc-your-firecrawl-key

# ===== DATABASE & AUTH =====

# Existing configuration
DATABASE_URL=your-database-url
CLERK_SECRET_KEY=your-clerk-secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-public-key
```

---

## 🎯 **Step-by-Step Provider Setup**

### **1. OpenRouter Setup (PRIORITY #1)**
*Provides access to 400+ models including GPT-4, Claude, Gemini, and more*

1. **Get API Key:**
   - Visit: https://openrouter.ai/keys
   - Sign up/login
   - Create new API key
   - Copy key to `OPENROUTER_API_KEY`

2. **Cost Benefits:**
   - Access to free models: `meta-llama/llama-3.2-3b-instruct:free`
   - Ultra-cheap models: DeepSeek Chat ($0.14 per 1M tokens)
   - All major providers in one API

3. **Available Model Categories:**
   ```
   • Free Models: Llama 3.2, Phi-3 Mini
   • Cost-Effective: DeepSeek, Qwen 2.5
   • Flagship: GPT-4, Claude 3.5, Mistral Large
   • Specialized: Grok, Perplexity Sonar (web search)
   ```

### **2. Replicate Setup (PRIORITY #2)**
*Specialized models for image, video, audio generation*

1. **Get API Token:**
   - Visit: https://replicate.com/account/api-tokens
   - Sign up/login
   - Create token
   - Copy to `REPLICATE_API_TOKEN`

2. **Available Models:**
   ```
   • Image Generation: FLUX.1.1 Pro, Ideogram v2
   • Video Generation: MiniMax Video-01, LTX Video
   • Audio: MusicGen
   • Image Processing: Real-ESRGAN, Background Removal
   • Vision: LLaVA 13B
   ```

### **3. Elasticsearch RAG Setup (CRITICAL)**
*Enables persistent memory and conversation context*

#### **Option A: Local Elasticsearch (Development)**
```bash
# Using Docker
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0

# Set environment
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_TLS=false
```

#### **Option B: Elasticsearch Cloud (Production)**
1. Visit: https://cloud.elastic.co/
2. Create free tier cluster
3. Get connection details
4. Set environment variables:
```bash
ELASTICSEARCH_URL=https://your-cluster.es.region.aws.found.io:9243
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-generated-password
ELASTICSEARCH_TLS=true
```

### **4. Firecrawl Web Search Setup**
*Real-time web search and content crawling*

1. **Get API Key:**
   - Visit: https://firecrawl.dev/
   - Sign up for account
   - Get API key from dashboard
   - Copy to `FIRECRAWL_API_KEY`

2. **Features Enabled:**
   - Real-time web search
   - Website content crawling
   - Automatic content cleaning
   - LLM-ready markdown output

### **5. Optional Providers**

#### **Claude Direct (Backup)**
- Visit: https://console.anthropic.com/
- Generate API key
- Set `ANTHROPIC_API_KEY`

#### **Google Vertex AI**
1. Create GCP project
2. Enable Vertex AI API
3. Create service account
4. Download JSON key
5. Set `GOOGLE_APPLICATION_CREDENTIALS`

---

## ⚙️ **Configuration Files**

### **Package Dependencies**

Add to your `package.json`:

```json
{
  "dependencies": {
    "@elastic/elasticsearch": "^8.11.0",
    "@mendable/firecrawl-js": "^0.0.19",
    "replicate": "^0.25.1",
    "openai": "^4.20.0"
  }
}
```

Install dependencies:
```bash
npm install @elastic/elasticsearch @mendable/firecrawl-js replicate
```

### **TypeScript Configuration**

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "paths": {
      "@/lib/*": ["./src/lib/*"],
      "@/components/*": ["./src/components/*"]
    }
  }
}
```

---

## 🧪 **Testing Your Configuration**

### **1. Test Basic Setup**

Create a test script `test-config.js`:

```javascript
import { modelCatalog } from './src/lib/catalog/ModelCatalog.js';
import { enhancedModelRouter } from './src/lib/router/EnhancedModelRouter.js';

async function testConfiguration() {
  try {
    // Initialize catalog
    await modelCatalog.initialize();
    
    // Get statistics
    const stats = await modelCatalog.getStatistics();
    console.log('✅ Model Catalog Stats:', stats);
    
    // Test provider health
    const health = await modelCatalog.getProviderHealth();
    console.log('✅ Provider Health:', health);
    
    // Test simple generation
    const response = await enhancedModelRouter.generateText({
      messages: [{ role: 'user', content: 'Hello, test message' }],
      model: 'meta-llama/llama-3.2-3b-instruct:free' // Free model
    });
    
    console.log('✅ Generation Test:', response.content);
    
  } catch (error) {
    console.error('❌ Configuration Error:', error);
  }
}

testConfiguration();
```

Run test:
```bash
node test-config.js
```

### **2. Test API Endpoints**

Test the new endpoints:

```bash
# Test model catalog
curl http://localhost:3000/api/models/catalog?action=statistics

# Test enhanced chat
curl -X POST http://localhost:3000/api/chat/enhanced \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Test RAG health
curl http://localhost:3000/api/rag?action=health

# Test web search health
curl http://localhost:3000/api/search/web?action=health
```

---

## 🎛️ **Usage Examples**

### **Using the Enhanced Router**

```typescript
import { enhancedModelRouter } from '@/lib/router/EnhancedModelRouter';

// Basic usage with automatic model selection
const response = await enhancedModelRouter.generateText({
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ],
  context: {
    userId: 'user123',
    preferences: {
      maxCostPerRequest: 0.01,
      qualityOverSpeed: true
    }
  },
  useRAG: true,
  requireWebSearch: false
});

// Specialized usage
const codeResponse = await enhancedModelRouter.generateText({
  messages: [
    { role: 'user', content: 'Write a React component for file upload' }
  ],
  model: 'qwen/qwen-2.5-coder-32b-instruct', // Specialized coding model
  fallbackModels: ['deepseek/deepseek-coder', 'mistralai/codestral']
});
```

### **Using Model Catalog**

```typescript
import { modelCatalog } from '@/lib/catalog/ModelCatalog';

// Get all free models
const freeModels = await modelCatalog.getModelsByFilter({
  freeOnly: true
});

// Get coding models under $0.001 per 1k tokens
const cheapCodingModels = await modelCatalog.getModelsByFilter({
  capabilities: ['code-generation'],
  maxCost: 0.001
});

// Get recommendations for specific task
const recommendations = await modelCatalog.getRecommendations({
  task: 'creative',
  budget: 'low',
  speed: 'quality'
});
```

### **Using RAG System**

```typescript
import { ElasticsearchRAG } from '@/lib/rag/ElasticsearchRAG';

const rag = new ElasticsearchRAG();

// Search user's memory
const memories = await rag.searchRelevantMemories(
  'user123',
  'machine learning projects',
  5
);

// Store conversation
await rag.storeConversation('user123', {
  id: 'conv123',
  userId: 'user123',
  messages: [/* conversation messages */]
});
```

---

## 🔧 **Advanced Configuration**

### **Custom Router Settings**

```typescript
import { EnhancedModelRouter } from '@/lib/router/EnhancedModelRouter';

const router = new EnhancedModelRouter({
  fallbackStrategy: 'cost-optimized', // or 'performance-first'
  maxRetries: 5,
  enableCaching: true,
  enableWebSearch: true,
  ragIntegration: true
});
```

### **Model Categories Customization**

You can modify model categories in `ModelCatalog.ts` to suit your needs:

```typescript
// Add custom category
{
  id: 'research',
  name: 'Research Models',
  description: 'Models optimized for academic research',
  filter: (model: ModelInfo) => 
    model.contextWindow >= 100000 && 
    model.capabilities.some(cap => cap.type === 'reasoning')
}
```

---

## 📊 **Monitoring & Analytics**

### **Built-in Monitoring**

The system provides comprehensive monitoring:

```typescript
// Get provider health
const health = await enhancedModelRouter.getProviderHealth();

// Get usage statistics
const stats = await modelCatalog.getStatistics();

// Get user memory stats
const memoryStats = await rag.getMemoryStats(userId);
```

### **Cost Tracking**

All responses include cost information:

```typescript
const response = await enhancedModelRouter.generateText(request);
console.log('Request cost:', response.cost);
console.log('Model used:', response.actualModel);
console.log('Provider:', response.providerUsed);
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Provider not available" errors**
   - Check API keys are correctly set
   - Verify provider health: `curl /api/models/catalog?action=health`

2. **Elasticsearch connection failed**
   - Ensure Elasticsearch is running
   - Check URL and credentials
   - Test: `curl $ELASTICSEARCH_URL/_cluster/health`

3. **High costs**
   - Use free models for testing: `meta-llama/llama-3.2-3b-instruct:free`
   - Set `maxCostPerRequest` in user preferences
   - Monitor usage via API

4. **Slow responses**
   - Enable caching: `enableCaching: true`
   - Use faster models for simple tasks
   - Check provider health

### **Debug Mode**

Enable debug logging:

```bash
DEBUG=omnix:* npm run dev
```

---

## 🎉 **Next Steps**

1. **Start with free models** to test the system
2. **Gradually add paid providers** based on your needs
3. **Monitor costs** and optimize model selection
4. **Enable RAG** for improved user experience
5. **Add web search** for real-time information

Your OmniX platform now supports 100+ AI models with advanced capabilities! 🚀

---

## 💡 **Pro Tips**

- **Use OpenRouter first** - it provides access to most models through one API
- **Enable caching** to reduce costs and improve speed
- **Set up RAG early** - it dramatically improves user experience
- **Monitor provider health** - the system auto-switches to healthy providers
- **Use model recommendations** - they optimize for your specific use case

For technical support, check the API endpoints or review the implementation files in `/src/lib/`.