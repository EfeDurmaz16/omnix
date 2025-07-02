# LangChain Integration Plan for Omnix

## Phase 1: Core RAG Enhancement (Week 1)

### 1.1 Replace Current Vector Store
```typescript
// Current: Custom EnhancedGCPVectorStore
// New: LangChain Firestore + OpenAI embeddings
import { FirestoreVectorStore } from "@langchain/community/vectorstores/firestore";
import { OpenAIEmbeddings } from "@langchain/openai";

const vectorStore = new FirestoreVectorStore(embeddings, {
  collectionName: "omnix-vectors",
  firestoreConfig: { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID }
});
```

### 1.2 Advanced Document Processing
```typescript
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ContextualCompressionRetriever } from "langchain/retrievers/contextual_compression";

// Better chunking strategy
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", " ", ""]
});

// Compression for better relevance
const compressor = new LLMChainExtractor({
  llm: openai,
  prompt: contextualCompressionPrompt
});
```

### 1.3 Enhanced Memory Management
```typescript
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/firestore";

const memory = new ConversationSummaryBufferMemory({
  llm: openai,
  chatHistory: new ChatMessageHistory({
    collectionName: "omnix-chat-history",
    userId: userId
  }),
  maxTokenLimit: 2000,
  returnMessages: true
});
```

## Phase 2: Agent Framework (Week 2)

### 2.1 Conversational RAG Agent
```typescript
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";

const ragChain = createRetrievalChain({
  retriever: vectorStore.asRetriever({
    searchType: "mmr", // Maximum Marginal Relevance
    searchKwargs: { fetchK: 20, lambda: 0.5 }
  }),
  combineDocsChain: createStuffDocumentsChain({
    llm: openai,
    prompt: contextualPrompt
  })
});
```

### 2.2 Tool-Using Agent for Image Generation
```typescript
import { DynamicTool } from "@langchain/core/tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";

const tools = [
  new DynamicTool({
    name: "image-generator",
    description: "Generate images with DALL-E, Midjourney, or Stable Diffusion",
    func: async (input) => {
      // Your existing image generation logic
      return await generateImage(input);
    }
  }),
  new DynamicTool({
    name: "image-editor", 
    description: "Edit existing images",
    func: async (input) => {
      // Your existing image editing logic
      return await editImage(input);
    }
  })
];

const agent = await createOpenAIFunctionsAgent({
  llm: openai,
  tools,
  prompt: agentPrompt
});
```

## Phase 3: LangSmith Observability (Week 3)

### 3.1 Tracing Setup
```typescript
import { LangChainTracer } from "langchain/callbacks";

// Environment setup
process.env.LANGCHAIN_TRACING_V2 = "true";
process.env.LANGCHAIN_PROJECT = "omnix-ai";
process.env.LANGCHAIN_API_KEY = "your-langsmith-key";

// Automatic tracing for all chains
const tracer = new LangChainTracer({
  projectName: "omnix-ai",
  tags: ["production", "rag", "chat"]
});
```

### 3.2 Performance Monitoring
```typescript
import { CallbackManager } from "@langchain/core/callbacks/manager";

const callbackManager = CallbackManager.fromHandlers({
  handleLLMStart: async (llm, prompts) => {
    console.log(`🤖 Starting ${llm.constructor.name} with ${prompts.length} prompts`);
  },
  handleLLMEnd: async (output) => {
    console.log(`✅ LLM completed with ${output.generations.length} generations`);
  },
  handleChainError: async (err, runId) => {
    console.error(`❌ Chain error (${runId}):`, err);
  }
});
```

## Phase 4: Advanced Features (Week 4)

### 4.1 Multi-Modal RAG
```typescript
import { MultiVectorRetriever } from "langchain/retrievers/multi_vector";

// Support for images, text, and documents
const multiVectorRetriever = new MultiVectorRetriever({
  vectorstore,
  docstore,
  idKey: "doc_id",
  childK: 20,
  parentK: 5
});
```

### 4.2 Adaptive Retrieval
```typescript
import { SelfQueryRetriever } from "langchain/retrievers/self_query";

const selfQueryRetriever = SelfQueryRetriever.fromLLM(
  openai,
  vectorStore,
  documentContentDescription,
  metadataFieldInfo
);
```

## Implementation Priority

### High Impact, Low Effort ⭐⭐⭐
1. **Replace embedding generation** with LangChain OpenAI embeddings (better caching)
2. **Add LangSmith tracing** for visibility into slow queries
3. **Implement conversation memory** with LangChain's built-in memory classes

### High Impact, Medium Effort ⭐⭐
1. **Enhanced RAG retrieval** with MMR and compression
2. **Agent framework** for tool use (image gen, editing, search)
3. **Better document chunking** strategies

### High Impact, High Effort ⭐
1. **Multi-modal retrieval** for images + text
2. **Custom evaluation metrics** in LangSmith
3. **Advanced agent architectures** (ReAct, Plan-and-Execute)

## Migration Strategy

### Week 1: Side-by-side deployment
- Keep existing system running
- Implement LangChain RAG in parallel
- A/B test performance

### Week 2: Gradual rollout  
- 10% of traffic to LangChain system
- Monitor metrics in LangSmith
- Compare response quality and speed

### Week 3: Full migration
- 100% traffic to LangChain
- Retire old vector store system
- Optimize based on LangSmith insights

## Expected Improvements

### Performance
- **30-50% faster** RAG queries (better caching, compression)
- **20-30% better** retrieval relevance (MMR, self-query)
- **Real-time monitoring** of bottlenecks

### Developer Experience  
- **Standardized abstractions** for RAG, agents, memory
- **Built-in observability** and debugging
- **Easier integration** of new models and tools

### User Experience
- **More contextual** responses (better memory management)
- **Tool-aware** conversations (agent can generate/edit images)
- **Faster response times** (optimized retrieval)