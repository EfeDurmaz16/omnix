import { ChromaClient, Collection, getEmbeddingFunction } from 'chromadb';
import OpenAI from 'openai';

export interface MemoryResult {
  content: string;
  relevanceScore: number;
  conversationId: string;
  timestamp: string;
  model: string;
  memoryType?: string;
  context?: string;
}

export interface ConversationContext {
  id: string;
  userId: string;
  messages: Array<{
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
    model?: string;
  }>;
  title?: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  snippet: string;
  timestamp: string;
  relevanceScore?: number;
}

export class ChromaRAG {
  private client: ChromaClient;
  private openai: OpenAI;
  private embeddingFunction: any;
  private isConnected = true;
  private collections: Map<string, Collection> = new Map();

  constructor() {
    // Check if Chroma is enabled
    const chromaEnabled = process.env.CHROMA_ENABLED !== 'false';
    
    if (!chromaEnabled) {
      console.log('📝 Chroma disabled via environment variable - RAG features will use fallback storage');
      this.isConnected = false;
      // Still initialize OpenAI for embeddings
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      return;
    }

    try {
      const chromaMode = process.env.CHROMA_MODE || 'server';
      
      if (chromaMode === 'embedded') {
        // Use embedded Chroma (no server required)
        this.client = new ChromaClient({
          // No path needed for embedded mode - uses local storage
        });
        console.log('✅ Chroma RAG system initialized in embedded mode');
      } else {
        // Use server mode
        this.client = new ChromaClient({
          path: process.env.CHROMA_URL || 'http://localhost:8000'
        });
        console.log('✅ Chroma RAG system initialized in server mode');
      }

      // Initialize OpenAI for embeddings
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Create embedding function (will be initialized when first used)
      this.embeddingFunction = null;

    } catch (error) {
      console.warn('⚠️ Chroma initialization failed - RAG features will be limited:', error);
      this.isConnected = false;
      
      // Still initialize OpenAI for fallback
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  private async getOrCreateCollection(name: string): Promise<Collection> {
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    try {
      let collection: Collection;
      
      // Try to get existing collection
      try {
        collection = await this.client.getCollection({
          name: name
        });
        console.log(`📦 Using existing collection: ${name}`);
      } catch (error) {
        // Collection doesn't exist, create it
        collection = await this.client.createCollection({
          name: name,
          metadata: {
            'hnsw:space': 'cosine',
            description: `OmniX ${name} collection`
          }
        });
        console.log(`✨ Created new collection: ${name}`);
      }

      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      console.error(`❌ Failed to get/create collection ${name}:`, error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit to model's max input
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  async storeConversation(userId: string, conversation: ConversationContext): Promise<void> {
    if (!this.isConnected) {
      console.warn('⚠️ Chroma not connected - skipping conversation storage');
      return;
    }
    
    try {
      const collectionName = `conversations_${userId}`;
      const collection = await this.getOrCreateCollection(collectionName);
      
      // Process each message
      for (let i = 0; i < conversation.messages.length; i++) {
        const message = conversation.messages[i];
        
        if (!message.content || message.content.trim().length < 10) continue;

        const extractedMemories = await this.extractMemories(message.content, message.role);
        
        const documentId = `${conversation.id}_${i}_${Date.now()}`;
        const metadata = {
          conversationId: conversation.id,
          role: message.role,
          timestamp: message.timestamp.toISOString(),
          model: message.model || 'unknown',
          userId: userId,
          messageIndex: i,
          conversationTitle: conversation.title || 'Untitled',
          extractedMemories: JSON.stringify(extractedMemories),
          ...conversation.metadata
        };

        // Generate embedding
        const embedding = await this.generateEmbedding(message.content);
        
        await collection.add({
          ids: [documentId],
          documents: [message.content],
          metadatas: [metadata],
          embeddings: [embedding]
        });
      }
      
      console.log(`✅ Stored conversation ${conversation.id} for user ${userId}`);
    } catch (error) {
      console.error('❌ Error storing conversation:', error);
    }
  }

  async searchRelevantMemories(
    userId: string,
    query: string,
    topK: number = 5,
    memoryTypes?: string[]
  ): Promise<MemoryResult[]> {
    if (!this.isConnected) {
      console.warn('⚠️ Chroma not connected - returning empty memories');
      return [];
    }
    
    try {
      const collectionName = `conversations_${userId}`;
      const collection = await this.getOrCreateCollection(collectionName);

      // Build where clause for filtering
      let whereClause: any = {};
      if (memoryTypes && memoryTypes.length > 0) {
        whereClause = {
          $and: memoryTypes.map(type => ({
            extractedMemories: { $contains: type }
          }))
        };
      }

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined
      });

      if (!results.documents || !results.documents[0] || !results.metadatas || !results.distances) {
        console.log(`📦 No memories found for user ${userId}`);
        return [];
      }

      const memories: MemoryResult[] = [];
      const documents = results.documents[0];
      const metadatas = results.metadatas[0];
      const distances = results.distances[0];

      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const metadata = metadatas[i] as any;
        const distance = distances[i];

        if (document && metadata) {
          // Convert distance to similarity score (cosine distance -> similarity)
          const relevanceScore = Math.max(0, 1 - distance);

          let extractedMemories: any[] = [];
          try {
            extractedMemories = JSON.parse(metadata.extractedMemories || '[]');
          } catch (e) {
            extractedMemories = [];
          }

          memories.push({
            content: document,
            relevanceScore,
            conversationId: metadata.conversationId,
            timestamp: metadata.timestamp,
            model: metadata.model,
            memoryType: extractedMemories[0]?.type || 'general',
            context: this.formatMemoryContext(document, extractedMemories)
          });
        }
      }

      console.log(`🔍 Found ${memories.length} relevant memories for user ${userId}`);
      return memories;
    } catch (error) {
      console.error('❌ Error searching memories:', error);
      return [];
    }
  }

  async storeWebSearchResults(
    userId: string,
    query: string,
    results: SearchResult[]
  ): Promise<void> {
    if (!this.isConnected) {
      console.warn('⚠️ Chroma not connected - skipping web search storage');
      return;
    }
    
    try {
      const collectionName = `websearch_${userId}`;
      const collection = await this.getOrCreateCollection(collectionName);
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const documentId = `${Date.now()}_${i}_${result.url.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        const metadata = {
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          timestamp: result.timestamp,
          query: query,
          userId: userId
        };

        // Generate embedding
        const embedding = await this.generateEmbedding(result.content);
        
        await collection.add({
          ids: [documentId],
          documents: [result.content],
          metadatas: [metadata],
          embeddings: [embedding]
        });
      }

      console.log(`✅ Stored ${results.length} web search results for user ${userId}`);
    } catch (error) {
      console.error('❌ Error storing web search results:', error);
    }
  }

  async searchWebHistory(
    userId: string,
    query: string,
    topK: number = 3
  ): Promise<SearchResult[]> {
    if (!this.isConnected) {
      console.warn('⚠️ Chroma not connected - returning empty web history');
      return [];
    }
    
    try {
      const collectionName = `websearch_${userId}`;
      const collection = await this.getOrCreateCollection(collectionName);

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK
      });

      if (!results.documents || !results.documents[0] || !results.metadatas || !results.distances) {
        return [];
      }

      const searchResults: SearchResult[] = [];
      const documents = results.documents[0];
      const metadatas = results.metadatas[0];
      const distances = results.distances[0];

      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const metadata = metadatas[i] as any;
        const distance = distances[i];

        if (document && metadata) {
          const relevanceScore = Math.max(0, 1 - distance);

          searchResults.push({
            title: metadata.title,
            url: metadata.url,
            content: document,
            snippet: metadata.snippet,
            timestamp: metadata.timestamp,
            relevanceScore
          });
        }
      }

      return searchResults;
    } catch (error) {
      console.error('❌ Error searching web history:', error);
      return [];
    }
  }

  private async extractMemories(content: string, role: string): Promise<Array<{ type: string; content: string; confidence: number }>> {
    if (role !== 'user' || content.length < 20) return [];

    try {
      const prompt = `Analyze this user message and extract any personal information, preferences, or facts. Return as JSON array.

Categories:
- preference: Things the user likes/dislikes
- skill: User's abilities or expertise
- fact: Personal facts about the user
- goal: User's objectives or intentions
- context: Important contextual information

Message: "${content}"

Return format: [{"type": "preference", "content": "extracted info", "confidence": 0.8}]
Return empty array if no extractable information.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });

      const extractedText = response.choices[0]?.message?.content || '[]';
      const memories = JSON.parse(extractedText);
      
      return Array.isArray(memories) ? memories.filter(m => m.confidence > 0.6) : [];
    } catch (error) {
      console.error('Error extracting memories:', error);
      return [];
    }
  }

  private formatMemoryContext(content: string, memories: any[]): string {
    if (memories.length === 0) return content.substring(0, 100) + '...';

    const memoryTexts = memories.map((m: any) => `${m.type}: ${m.content}`).join('; ');
    return `${memoryTexts} | Original: ${content.substring(0, 50)}...`;
  }

  async getMemoryStats(userId: string): Promise<{
    totalConversations: number;
    totalMemories: number;
    memoryBreakdown: Record<string, number>;
    lastActivity: string | null;
  }> {
    if (!this.isConnected) {
      return {
        totalConversations: 0,
        totalMemories: 0,
        memoryBreakdown: {},
        lastActivity: null
      };
    }

    try {
      const collectionName = `conversations_${userId}`;
      const collection = await this.getOrCreateCollection(collectionName);

      // Get all documents
      const results = await collection.get({});
      
      if (!results.metadatas) {
        return {
          totalConversations: 0,
          totalMemories: 0,
          memoryBreakdown: {},
          lastActivity: null
        };
      }

      const metadatas = results.metadatas as any[];
      const uniqueConversations = new Set();
      const memoryBreakdown: Record<string, number> = {};
      let lastActivity: string | null = null;
      let totalMemories = 0;

      for (const metadata of metadatas) {
        if (metadata.conversationId) {
          uniqueConversations.add(metadata.conversationId);
        }

        try {
          const extractedMemories = JSON.parse(metadata.extractedMemories || '[]');
          for (const memory of extractedMemories) {
            memoryBreakdown[memory.type] = (memoryBreakdown[memory.type] || 0) + 1;
            totalMemories++;
          }
        } catch (e) {
          // Skip invalid memory data
        }

        if (metadata.timestamp) {
          if (!lastActivity || metadata.timestamp > lastActivity) {
            lastActivity = metadata.timestamp;
          }
        }
      }

      return {
        totalConversations: uniqueConversations.size,
        totalMemories,
        memoryBreakdown,
        lastActivity
      };
    } catch (error) {
      console.error('❌ Error getting memory stats:', error);
      return {
        totalConversations: 0,
        totalMemories: 0,
        memoryBreakdown: {},
        lastActivity: null
      };
    }
  }

  async clearUserMemories(userId: string): Promise<void> {
    if (!this.isConnected) {
      console.warn('⚠️ Chroma not connected - cannot clear memories');
      return;
    }

    try {
      const conversationCollection = `conversations_${userId}`;
      const websearchCollection = `websearch_${userId}`;

      // Delete conversation memories
      try {
        await this.client.deleteCollection({ name: conversationCollection });
        this.collections.delete(conversationCollection);
        console.log(`✅ Deleted conversation collection: ${conversationCollection}`);
      } catch (error) {
        console.log(`ℹ️ Conversation collection ${conversationCollection} didn't exist`);
      }

      // Delete web search history
      try {
        await this.client.deleteCollection({ name: websearchCollection });
        this.collections.delete(websearchCollection);
        console.log(`✅ Deleted websearch collection: ${websearchCollection}`);
      } catch (error) {
        console.log(`ℹ️ Websearch collection ${websearchCollection} didn't exist`);
      }

      console.log(`✅ Cleared all memories for user ${userId}`);
    } catch (error) {
      console.error('❌ Error clearing user memories:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) return false;
    
    try {
      await this.client.heartbeat();
      return true;
    } catch {
      return false;
    }
  }

  async isInitialized(): Promise<boolean> {
    return this.healthCheck();
  }
}