import { GoogleAuth } from 'google-auth-library';
import OpenAI from 'openai';
import { ConversationContext, ContextMessage } from '../context/AdvancedContextManager';
import { memorySearchCache, embeddingCache, userProfileCache } from '../cache/MemoryCache';
import { getMemoryConfigForPlan, getMemoryConfigFromEnv, DEFAULT_MEMORY_CONFIG } from '../config/memory-config';

export interface MemoryResult {
  content: string;
  relevanceScore: number;
  conversationId: string;
  timestamp: string;
  model: string;
  messageId: string;
  metadata?: Record<string, any>;
}

export interface ExtractedMemory {
  type: 'preference' | 'skill' | 'fact' | 'goal' | 'topic' | 'question' | 'knowledge' | 'context';
  content: string;
  confidence: number;
  extractedFrom: string;
  timestamp: Date;
}

export class EnhancedGCPVectorStore {
  private auth: GoogleAuth;
  private openai: OpenAI;
  private initialized = false;
  private projectId: string;
  private location: string = 'us-central1';
  private indexEndpoint: string = '';
  private useVectorSearch: boolean = false;
  private embeddingCache = new Map<string, number[]>();
  private resultCache = new Map<string, { results: any; timestamp: number }>();
  private cacheMaxSize = 1000; // Increased cache size for better performance
  private resultCacheTimeout = 1000 * 60 * 5; // 5 minutes
  private cacheHits = 0;
  private cacheMisses = 0;
  private searchMetrics = { totalSearches: 0, avgLatency: 0, cacheHitRate: 0 };

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.indexEndpoint = process.env.VERTEX_AI_INDEX_ENDPOINT || '';
    
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.initializeVectorStore();
  }

  private async initializeVectorStore(): Promise<void> {
    try {
      if (!this.projectId) {
        console.warn('⚠️ GOOGLE_CLOUD_PROJECT_ID not set, vector search disabled');
        return;
      }

      // Try to initialize Vector Search first, fall back to Firestore
      if (this.indexEndpoint) {
        try {
          this.useVectorSearch = true;
          console.log('✅ Vertex AI Vector Search mode enabled');
        } catch (error) {
          console.warn('⚠️ Vector Search unavailable, using Firestore fallback:', error);
          this.useVectorSearch = false;
        }
      } else {
        console.log('📦 Using Firestore vector storage (set VERTEX_AI_INDEX_ENDPOINT to upgrade)');
        this.useVectorSearch = false;
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      this.initialized = false;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text.trim()) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const normalizedText = text.substring(0, 8000);
    // Use full text as cache key for short queries, truncated for long ones
    const cacheKey = normalizedText.length <= 100 ? normalizedText : normalizedText.substring(0, 100);
    
    // Note: Removed dummy embeddings as they caused cosine similarity calculation issues
    // Real embeddings will be generated and cached properly
    
    // Check advanced cache first
    const cachedEmbedding = embeddingCache.get(cacheKey);
    if (cachedEmbedding) {
      this.cacheHits++;
      if (this.cacheHits % 10 === 0) {
        const stats = embeddingCache.getStats();
        console.log(`⚡ Advanced embedding cache stats: ${stats.hits} hits, ${stats.misses} misses, ${stats.hitRate}% hit rate`);
      }
      return cachedEmbedding;
    }
    
    // Fallback to legacy cache
    if (this.embeddingCache.has(cacheKey)) {
      this.cacheHits++;
      return this.embeddingCache.get(cacheKey)!;
    }

    const startTime = performance.now();
    
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: normalizedText,
      });

      const embedding = response.data[0].embedding;
      this.cacheMisses++;
      
      const embeddingTime = performance.now() - startTime;
      if (embeddingTime > 500) { // Log slow embedding generations
        console.log(`⚠️ Slow embedding generation: ${embeddingTime.toFixed(2)}ms for text length ${normalizedText.length}`);
      }
      
      // Store in advanced cache (with automatic LRU eviction)
      embeddingCache.set(cacheKey, embedding);
      
      // Also store in legacy cache for compatibility
      if (this.embeddingCache.size >= this.cacheMaxSize) {
        // Remove oldest 10% of cache entries for better performance
        const keysToDelete = Array.from(this.embeddingCache.keys()).slice(0, Math.floor(this.cacheMaxSize * 0.1));
        keysToDelete.forEach(key => this.embeddingCache.delete(key));
      }
      this.embeddingCache.set(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error('Embedding generation failed');
    }
  }

  async storeConversation(
    userId: string, 
    conversation: ConversationContext
  ): Promise<void> {
    if (!this.initialized) {
      console.warn('Vector store not initialized, skipping conversation storage');
      return;
    }

    if (this.useVectorSearch) {
      console.log('🚀 Vector Search mode: Enhanced storage with metadata');
    } else {
      console.log('📦 Firestore mode: Basic vector storage');
    }

    // For now, use Firestore for both modes (Vector Search integration requires more setup)
    await this.storeConversationFirestore(userId, conversation);
  }

  private async storeConversationFirestore(
    userId: string, 
    conversation: ConversationContext
  ): Promise<void> {
    try {
      console.log(`🔄 DEBUG: Starting conversation storage for user ${userId}, conversation ${conversation.id}`);
      console.log(`📊 DEBUG: Conversation has ${conversation.messages.length} messages`);
      
      const embeddings = await this.generateEmbeddings(conversation.messages);
      console.log(`🧠 DEBUG: Generated ${embeddings?.length || 0} embeddings`);
      
      if (!embeddings || embeddings.length === 0) {
        console.warn(`⚠️ DEBUG: No embeddings generated for conversation ${conversation.id}`);
        return;
      }
      
      const db = await this.getFirestoreClient();
      const docRef = db.collection('user-vectors').doc(`${userId}-${conversation.id}`);
      
      const messagesToStore = conversation.messages
        .map((msg, idx) => ({
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp,
          embedding: embeddings && embeddings[idx] ? embeddings[idx] : null,
          messageId: msg.id || `msg-${idx}`,
        }))
        .filter(msg => msg.embedding !== null); // Only store messages with valid embeddings
      
      console.log(`💾 DEBUG: Storing ${messagesToStore.length} messages with embeddings`);
      
      try {
        // Calculate metadata with error handling
        const chatId = this.extractChatIdFromConversation(conversation.id);
        const importance = await this.calculateImportance(messagesToStore);
        const topics = await this.extractTopics(messagesToStore);
        
        // Metadata calculated for conversation storage
        
        const documentData = {
          userId,
          conversationId: conversation.id,
          messages: messagesToStore,
          metadata: {
            ...conversation.metadata,
            // Add hierarchical metadata for better cross-chat memory
            memoryLevel: 'conversation', // conversation | chat | user
            chatId: chatId,
            importance: importance,
            topics: topics,
            accessCount: 0
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          storageType: this.useVectorSearch ? 'vector-search-ready' : 'firestore',
        };
        
        console.log(`💾 DEBUG: Document data prepared, saving to Firestore...`);
        await docRef.set(documentData);
        console.log(`✅ DEBUG: Successfully stored conversation ${conversation.id} for user ${userId} in Firestore`);
        
      } catch (metadataError) {
        console.error('❌ DEBUG: Failed to calculate metadata or store document:', metadataError);
        throw metadataError;
      }
      console.log(`📄 DEBUG: Document ID: ${docRef.id}`);
      console.log(`📍 DEBUG: Document path: user-vectors/${userId}-${conversation.id}`);
      
    } catch (error) {
      console.error('❌ DEBUG: Failed to store conversation:', error);
      throw error;
    }
  }

  /**
   * Extract chat ID from conversation ID for hierarchical organization
   */
  private extractChatIdFromConversation(conversationId: string): string {
    // Extract chat identifier from conversation ID
    // Handle patterns like: 
    // - "ctx_1752512573393_yt31r2k7w" -> "ctx"
    // - "conv_1752508427309" -> "conv"
    // - "chat_123_session_456" -> "chat"
    const parts = conversationId.split('_');
    if (parts.length >= 1) {
      // Return the prefix part (ctx, conv, chat, etc.)
      return parts[0];
    }
    // Fallback: use whole ID
    return conversationId;
  }

  /**
   * Calculate conversation importance for memory promotion
   */
  private async calculateImportance(messages: any[]): Promise<number> {
    try {
      // Simple heuristic-based importance calculation
      let importance = 0.5; // Base importance
      
      // Factor 1: Message count (more messages = more important)
      importance += Math.min(messages.length * 0.05, 0.2);
      
      // Factor 2: Total content length (more content = more detailed discussion)
      const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
      importance += Math.min(totalLength / 5000, 0.2); // Normalize by 5000 chars
      
      // Factor 3: Presence of code/technical content
      const hasCode = messages.some(msg => 
        msg.content.includes('```') || 
        msg.content.includes('function') || 
        msg.content.includes('class ')
      );
      if (hasCode) importance += 0.1;
      
      // Factor 4: Question-answer patterns (educational value)
      const hasQuestions = messages.some(msg => 
        msg.content.includes('?') || 
        msg.content.toLowerCase().includes('how to') ||
        msg.content.toLowerCase().includes('what is')
      );
      if (hasQuestions) importance += 0.1;
      
      return Math.min(importance, 1.0);
    } catch (error) {
      console.warn('Failed to calculate importance:', error);
      return 0.5;
    }
  }

  /**
   * Extract main topics from conversation for better categorization
   */
  private async extractTopics(messages: any[]): Promise<string[]> {
    try {
      const conversationText = messages
        .map(msg => msg.content)
        .join(' ')
        .substring(0, 1000); // Limit to first 1000 chars for efficiency
      
      // Simple keyword-based topic extraction (could be enhanced with NLP)
      const topicKeywords = [
        'javascript', 'typescript', 'react', 'nextjs', 'node', 'python',
        'machine learning', 'ai', 'database', 'sql', 'mongodb', 'firebase',
        'authentication', 'api', 'backend', 'frontend', 'css', 'html',
        'deployment', 'docker', 'aws', 'gcp', 'security', 'testing',
        'optimization', 'performance', 'debugging', 'error', 'fix'
      ];
      
      const foundTopics = topicKeywords.filter(keyword => 
        conversationText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      return foundTopics.slice(0, 5); // Limit to 5 topics
    } catch (error) {
      console.warn('Failed to extract topics:', error);
      return [];
    }
  }

  /**
   * Extract importance score from memory metadata
   */
  private getImportanceFromMetadata(metadata: any): number {
    if (metadata && typeof metadata.importance === 'number') {
      return metadata.importance;
    }
    return 0.5; // Default importance
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      console.warn('Invalid vectors for cosine similarity calculation');
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Process documents with hierarchical similarity (prioritize current chat)
   */
  private async processDocumentsForHierarchicalSimilarity(
    docs: any[],
    queryEmbedding: number[],
    query: string,
    topK: number,
    currentChatId?: string
  ): Promise<MemoryResult[]> {
    const results: MemoryResult[] = [];
    
    // Separate current chat vs cross-chat documents
    const currentChatDocs = currentChatId ? 
      docs.filter(doc => {
        const data = doc.data();
        const docChatId = data.metadata?.chatId || this.extractChatIdFromConversation(data.conversationId);
        return docChatId === currentChatId;
      }) : [];
    
    const crossChatDocs = currentChatId ? 
      docs.filter(doc => {
        const data = doc.data();
        const docChatId = data.metadata?.chatId || this.extractChatIdFromConversation(data.conversationId);
        return docChatId !== currentChatId;
      }) : docs;

    console.log(`📊 Hierarchical search: ${currentChatDocs.length} current chat, ${crossChatDocs.length} cross-chat docs`);
    // Current chat ID filter applied for hierarchical search
    
    // Debug document chat IDs
    if (docs.length > 0) {
      const sampleDoc = docs[0].data();
      const extractedChatId = this.extractChatIdFromConversation(sampleDoc.conversationId);
      // Sample document chat ID extraction for filtering
    }

    // Process current chat documents first (with higher weight)
    const currentChatResults = await this.processDocumentsBatch(
      currentChatDocs,
      queryEmbedding,
      query,
      1.3 // 30% boost for current chat relevance
    );

    // Process cross-chat documents
    const crossChatResults = await this.processDocumentsBatch(
      crossChatDocs,
      queryEmbedding,
      query,
      1.0 // Normal weight
    );

    // Combine results with current chat getting priority
    results.push(...currentChatResults);
    results.push(...crossChatResults);

    console.log(`🔍 Hierarchical results: ${currentChatResults.length} current + ${crossChatResults.length} cross-chat`);
    
    return results;
  }

  /**
   * Process a batch of documents for similarity
   */
  private async processDocumentsBatch(
    docs: any[],
    queryEmbedding: number[],
    query: string,
    relevanceBoost: number = 1.0
  ): Promise<MemoryResult[]> {
    const results: MemoryResult[] = [];
    console.log(`🔄 Processing batch of ${docs.length} documents with boost ${relevanceBoost}`);
    
    for (const doc of docs) {
      try {
        const data = doc.data();
        
        console.log(`📄 Document ${doc.id}: ${data.messages?.length || 0} messages`);
        
        for (const message of data.messages || []) {
          if (!message.embedding || !Array.isArray(message.embedding)) {
            console.log(`⚠️ Message missing embedding: ${message.messageId || 'unknown'}`);
            continue;
          }

          // Calculate similarity
          const similarity = this.calculateCosineSimilarity(queryEmbedding, message.embedding);
          console.log(`🔍 Similarity: ${similarity.toFixed(4)} for message: ${message.content.substring(0, 50)}...`);
          
          if (similarity > 0.1) { // Lowered threshold for better recall
            results.push({
              content: message.content,
              relevanceScore: similarity * relevanceBoost, // Apply hierarchy boost
              conversationId: data.conversationId,
              timestamp: message.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
              model: message.model || 'unknown',
              messageId: message.messageId,
              metadata: {
                ...data.metadata,
                originalSimilarity: similarity,
                hierarchyBoost: relevanceBoost,
                chatId: data.metadata?.chatId || this.extractChatIdFromConversation(data.conversationId)
              }
            });
          }
        }
      } catch (error) {
        console.warn('Failed to process document for similarity:', error);
      }
    }
    
    return results;
  }

  async generateEmbeddings(messages: ContextMessage[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const message of messages) {
      try {
        const embedding = await this.generateEmbedding(message.content);
        embeddings.push(embedding);
      } catch (error) {
        console.warn('Failed to generate embedding for message:', message.id, error);
        // Skip messages with failed embeddings instead of using zero-filled arrays
        // which cause cosine similarity calculation issues
        continue;
      }
    }
    
    return embeddings;
  }

  async searchRelevantMemories(
    userId: string, 
    query: string, 
    topK: number = 5,
    userPlan: string = 'FREE',
    currentChatId?: string
  ): Promise<MemoryResult[]> {
    if (!this.initialized) {
      console.warn('⚠️ Vector store not initialized, returning empty memories');
      return [];
    }

    const startTime = performance.now();
    this.searchMetrics.totalSearches++;

    try {
      // OPTIMIZATION 1: Check result cache first
      const cacheKey = `${userId}-${query.substring(0, 100)}-${topK}`;
      const cached = this.resultCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.resultCacheTimeout) {
        this.cacheHits++;
        const duration = performance.now() - startTime;
        this.updateMetrics(duration);
        console.log(`⚡ Result cache hit for memory search (${duration.toFixed(2)}ms)`);
        return cached.results as MemoryResult[];
      }
      this.cacheMisses++;

      console.log(`🔍 CROSS-CHAT: Searching ALL conversation memories for user ${userId.substring(0, 20)}... query: "${query.substring(0, 30)}"`);      
      
      const db = await this.getFirestoreClient();
      
      // Check user document collections exist
      
      // CROSS-CHAT FIX: Search across ALL user conversations, not just current chat
      const [queryEmbedding, userDocsSnapshot] = await Promise.all([
        this.generateEmbedding(query),
        db.collection('user-vectors')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc') // Get most recent first
          .limit(getMemoryConfigForPlan(userPlan).maxConversationsPerQuery * 3) // Increased limit for cross-chat search
          .get()
      ]);

      console.log(`📊 Found ${userDocsSnapshot.docs.length} conversation documents for user ${userId}`);
      
      // Document structure verified
      
      if (userDocsSnapshot.empty) {
        console.log('📭 No conversation memories found in database');
        const result: MemoryResult[] = [];
        this.cacheResult(cacheKey, result as any);
        return result;
      }

      // HIERARCHICAL PROCESSING: Prioritize current chat while including cross-chat context
      const results = await this.processDocumentsForHierarchicalSimilarity(
        userDocsSnapshot.docs,
        queryEmbedding,
        query,
        topK,
        currentChatId
      );
      
      // Sort with hierarchical prioritization: importance + recency + relevance
      const sortedResults = results
        .sort((a, b) => {
          // Primary sort: relevance score
          const relevanceDiff = b.relevanceScore - a.relevanceScore;
          if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff;
          
          // Secondary sort: importance (if relevance is similar)
          const importanceA = this.getImportanceFromMetadata(a.metadata);
          const importanceB = this.getImportanceFromMetadata(b.metadata);
          const importanceDiff = importanceB - importanceA;
          if (Math.abs(importanceDiff) > 0.1) return importanceDiff;
          
          // Tertiary sort: recency
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        })
        .slice(0, topK);

      const endTime = performance.now();
      const duration = endTime - startTime;
      this.updateMetrics(duration);
      
      console.log(`⏱️ OPTIMIZED: Conversation memory search completed in ${duration.toFixed(2)}ms`);
      console.log(`📊 Found ${sortedResults.length}/${results.length} relevant conversation memories`);

      // Cache the result
      this.cacheResult(cacheKey, sortedResults as any);

      return sortedResults;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.updateMetrics(duration);
      console.error(`❌ OPTIMIZED: Failed to search conversation memories (${duration.toFixed(2)}ms):`, error);
      return [];
    }
  }

  async storeMemories(userId: string, memories: ExtractedMemory[]): Promise<void> {
    if (!this.initialized || memories.length === 0) {
      console.log('⚠️ Vector store not initialized or no memories to store');
      return;
    }

    try {
      console.log(`💾 Storing ${memories.length} memories for user ${userId}`);
      
      const db = await this.getFirestoreClient();
      const batch = db.batch();

      for (const memory of memories) {
        const embedding = await this.generateEmbedding(memory.content);
        const docRef = db.collection('user-memories').doc();
        
        const memoryData = {
          userId,
          type: memory.type,
          content: memory.content,
          confidence: memory.confidence,
          extractedFrom: memory.extractedFrom,
          timestamp: memory.timestamp,
          embedding,
          createdAt: new Date(),
          storageType: this.getStorageType(),
        };
        
        batch.set(docRef, memoryData);
        console.log(`📝 Prepared memory for storage: ${memory.type} - ${memory.content.substring(0, 100)}...`);
      }

      await batch.commit();
      console.log(`✅ Successfully stored ${memories.length} memories for user ${userId}`);
      
      // Clear relevant caches to ensure fresh data
      this.clearUserCaches(userId);
      
    } catch (error) {
      console.error('❌ Failed to store memories:', error);
      throw error;
    }
  }

  async searchUserMemories(
    userId: string, 
    query: string, 
    memoryType?: string,
    topK: number = 3
  ): Promise<ExtractedMemory[]> {
    if (!this.initialized) {
      console.warn('⚠️ Vector store not initialized');
      return [];
    }

    const startTime = performance.now();

    try {
      console.log(`🔍 Searching user memories for "${query.substring(0, 30)}" type: ${memoryType || 'any'}`);
      
      const db = await this.getFirestoreClient();
      
      // Build query
      let queryRef = db.collection('user-memories').where('userId', '==', userId);
      
      if (memoryType) {
        queryRef = queryRef.where('type', '==', memoryType);
      }

      const snapshot = await queryRef.limit(50).get(); // Increased limit for better results
      
      console.log(`📄 Found ${snapshot.docs.length} user memory documents`);
      
      if (snapshot.empty) {
        console.log('📭 No user memories found in database');
        return [];
      }

      // Generate query embedding for similarity search
      const [queryEmbedding] = await Promise.all([
        this.generateEmbedding(query)
      ]);
      
      // Process all docs and calculate similarity
      const results: ExtractedMemory[] = [];
      let processedCount = 0;
      let validEmbeddingCount = 0;
      let aboveThresholdCount = 0;
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        processedCount++;
        
        // Removed excessive per-document logging
        
        if (data.embedding && queryEmbedding) {
          validEmbeddingCount++;
          
          // Validate embedding format
          if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
            console.warn(`⚠️ Invalid embedding format in document ${processedCount}:`, {
              isArray: Array.isArray(data.embedding),
              length: data.embedding?.length || 0
            });
            return;
          }
          
          const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
          
          // Very lenient threshold for user memories, especially for profile queries
          const isProfileQuery = query.toLowerCase().includes('who am i') || 
                                 query.toLowerCase().includes('profile') || 
                                 query.toLowerCase().includes('about me') ||
                                 query.toLowerCase().includes('personal');
          
          // Lower thresholds to catch more relevant memories
          const threshold = isProfileQuery ? 0.05 : 0.15;
          
          // Removed excessive similarity logging for performance
          
          if (similarity > threshold) {
            aboveThresholdCount++;
            results.push({
              type: data.type,
              content: data.content,
              confidence: similarity,
              extractedFrom: data.extractedFrom || 'unknown',
              timestamp: data.timestamp?.toDate?.() || new Date()
            });
          }
        } else {
          // Skipping document due to missing embedding
        }
      });
      
      // Processing completed: ${processedCount} docs, ${aboveThresholdCount} above threshold
      
      // Sort by confidence and limit results
      const sortedResults = results
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, topK);

      const endTime = performance.now();
      console.log(`⏱️ User memory search completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📊 Found ${sortedResults.length} relevant memories:`, sortedResults.map(m => `${m.type}: ${m.content.substring(0, 50)}...`));

      return sortedResults;
      
    } catch (error) {
      const endTime = performance.now();
      console.error(`❌ User memory search failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
      return [];
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    if (!this.initialized) {
      console.warn('Vector store not initialized, skipping data deletion');
      return;
    }

    try {
      const db = await this.getFirestoreClient();
      
      const collections = ['user-vectors', 'user-memories'];
      
      for (const collectionName of collections) {
        const snapshot = await db.collection(collectionName)
          .where('userId', '==', userId)
          .get();

        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        
        if (!snapshot.empty) {
          await batch.commit();
        }
      }

      console.log(`✅ Deleted all vector data for user ${userId}`);
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw error;
    }
  }

  async getStorageStats(userId: string): Promise<{
    conversationCount: number;
    memoryCount: number;
    totalVectors: number;
    storageType: 'firestore' | 'vector-search' | 'uninitialized';
  }> {
    if (!this.initialized) {
      return { conversationCount: 0, memoryCount: 0, totalVectors: 0, storageType: 'uninitialized' };
    }

    try {
      const db = await this.getFirestoreClient();
      
      const [vectorsSnapshot, memoriesSnapshot] = await Promise.all([
        db.collection('user-vectors').where('userId', '==', userId).get(),
        db.collection('user-memories').where('userId', '==', userId).get(),
      ]);

      return {
        conversationCount: vectorsSnapshot.size,
        memoryCount: memoriesSnapshot.size,
        totalVectors: vectorsSnapshot.size + memoriesSnapshot.size,
        storageType: this.getStorageType(),
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { conversationCount: 0, memoryCount: 0, totalVectors: 0, storageType: 'uninitialized' };
    }
  }

  async syncUserProfile(userId: string, forceSync: boolean = false): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️ Vector store not initialized, skipping profile sync');
      return;
    }

    try {
      console.log(`🔄 Syncing user profile for ${userId} (force: ${forceSync})`);
      
      // Check if we already have recent profile data
      if (!forceSync) {
        const existingProfile = await this.searchUserMemories(userId, 'user profile personal info', 'fact', 1);
        if (existingProfile.length > 0) {
          const profileAge = Date.now() - existingProfile[0].timestamp.getTime();
          if (profileAge < 24 * 60 * 60 * 1000) { // Less than 24 hours old
            console.log(`⚡ User profile for ${userId} is recent, skipping sync`);
            return;
          }
        }
      }

      // Known user profiles that should be synced
      const knownProfiles = new Map([
        ['user_2ybWF4Ns1Bzgr1jYDYkFkdDWWQU', {
          name: 'Efe',
          age: 19,
          education: 'Information Systems & Technologies at Bilkent University',
          work: 'Nokia Network Engineering Intern',
          location: 'Bursa, Turkey',
          interests: 'AI development, technology, computer science',
          projects: 'omnix AI agent platform development',
          skills: 'Python, JavaScript, TypeScript, AI/ML, network engineering',
          background: 'Tech-savvy university student with practical experience'
        }]
      ]);

      const profileData = knownProfiles.get(userId);
      if (!profileData) {
        console.log(`📝 No profile data found for user ${userId}`);
        return;
      }

      console.log(`🔄 Syncing comprehensive profile for ${profileData.name}`);

      // Create comprehensive profile memories
      const profileMemories: ExtractedMemory[] = [
        {
          type: 'fact',
          content: `User's name is ${profileData.name}, age ${profileData.age}, from ${profileData.location}`,
          confidence: 0.95,
          extractedFrom: 'profile-sync',
          timestamp: new Date()
        },
        {
          type: 'fact',
          content: `Education: ${profileData.education}`,
          confidence: 0.95,
          extractedFrom: 'profile-sync',
          timestamp: new Date()
        },
        {
          type: 'fact',
          content: `Current work: ${profileData.work}`,
          confidence: 0.95,
          extractedFrom: 'profile-sync',
          timestamp: new Date()
        },
        {
          type: 'preference',
          content: `Interests: ${profileData.interests}`,
          confidence: 0.9,
          extractedFrom: 'profile-sync',
          timestamp: new Date()
        },
        {
          type: 'skill',
          content: `Technical skills: ${profileData.skills}`,
          confidence: 0.9,
          extractedFrom: 'profile-sync',
          timestamp: new Date()
        },
        {
          type: 'goal',
          content: `Current projects: ${profileData.projects}`,
          confidence: 0.85,
          extractedFrom: 'profile-sync',
          timestamp: new Date()
        },
        {
          type: 'context',
          content: `Background: ${profileData.background}`,
          confidence: 0.8,
          extractedFrom: 'profile-sync',
          timestamp: new Date()
        }
      ];

      // Store the profile memories
      await this.storeMemories(userId, profileMemories);

      // Clear relevant caches to force refresh
      this.clearUserCaches(userId);

      console.log(`✅ Profile sync completed for ${profileData.name} - ${profileMemories.length} memories stored`);
      
    } catch (error) {
      console.error('❌ Profile sync failed:', error);
      throw error;
    }
  }

  private async getFirestoreClient() {
    const firestoreModule = await import('@google-cloud/firestore');
    const Firestore = firestoreModule.Firestore || firestoreModule.default;
    return new Firestore({
      projectId: this.projectId,
      databaseId: 'omni',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) {
      console.warn(`⚠️ Invalid embeddings for similarity calculation: a.length=${a?.length || 0}, b.length=${b?.length || 0}`);
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    let invalidCount = 0;
    
    for (let i = 0; i < a.length; i++) {
      if (typeof a[i] !== 'number' || typeof b[i] !== 'number' || isNaN(a[i]) || isNaN(b[i])) {
        invalidCount++;
        if (invalidCount <= 3) { // Only log first few errors
          console.warn(`⚠️ Non-numeric values in embeddings at index ${i}: a[${i}]=${a[i]}, b[${i}]=${b[i]}`);
        }
        continue; // Skip invalid values instead of returning 0
      }
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (invalidCount > 0) {
      console.warn(`⚠️ Found ${invalidCount} invalid values in embeddings during similarity calculation`);
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    const similarity = denominator === 0 ? 0 : dotProduct / denominator;
    
    // Log suspicious similarity values
    if (similarity < 0 || similarity > 1) {
      console.warn(`⚠️ Suspicious similarity score: ${similarity} (should be between 0 and 1)`);
    }
    
    return similarity;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getStorageType(): 'firestore' | 'vector-search' | 'uninitialized' {
    if (!this.initialized) return 'uninitialized';
    return this.useVectorSearch ? 'vector-search' : 'firestore';
  }

  /**
   * Clear user-specific caches
   */
  private clearUserCaches(userId: string): void {
    const cacheKeys = [
      `profile_${userId}`,
      `memory_search_${userId}_user profile`,
      `memory_search_${userId}_who am i`,
      `memory_search_${userId}_what do you know about me`,
      `memory_search_${userId}_personal info`,
      `memory_search_${userId}_about me`
    ];

    cacheKeys.forEach(key => {
      // Clear from various cache systems
      this.embeddingCache.delete(key);
      memorySearchCache.delete(key);
      userProfileCache.delete(key);
    });

    console.log(`🧹 Cleared ${cacheKeys.length} cache entries for user ${userId}`);
  }

  /**
   * Clean up old conversations based on retention policy
   */
  async cleanupOldConversations(userId: string, userPlan: string = 'FREE'): Promise<void> {
    try {
      const config = getMemoryConfigForPlan(userPlan);
      const db = await this.getFirestoreClient();
      
      // Get all conversations for user, sorted by creation date
      const allConversations = await db.collection('user-vectors')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      if (allConversations.size <= config.maxConversationsToRetain) {
        console.log(`✅ User ${userId} has ${allConversations.size} conversations, within limit of ${config.maxConversationsToRetain}`);
        return;
      }

      // Get conversations to delete (beyond retention limit)
      const conversationsToDelete = allConversations.docs.slice(config.maxConversationsToRetain);
      
      console.log(`🧹 Cleaning up ${conversationsToDelete.length} old conversations for user ${userId}`);
      
      // Delete in batches to avoid Firestore limits
      const batchSize = 500; // Firestore batch limit
      for (let i = 0; i < conversationsToDelete.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = conversationsToDelete.slice(i, i + batchSize);
        
        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`🗑️ Deleted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(conversationsToDelete.length / batchSize)}`);
      }
      
      console.log(`✅ Cleanup completed for user ${userId}. Retained ${config.maxConversationsToRetain} most recent conversations`);
      
    } catch (error) {
      console.error('❌ Conversation cleanup failed:', error);
    }
  }

  /**
   * Schedule periodic cleanup for a user
   */
  async scheduleUserCleanup(userId: string, userPlan: string = 'FREE'): Promise<void> {
    // Run cleanup immediately if needed
    await this.cleanupOldConversations(userId, userPlan);
    
    // Cache cleanup completion
    const cleanupKey = `cleanup_${userId}`;
    const cache = memorySearchCache.get(cleanupKey);
    if (!cache) {
      memorySearchCache.set(cleanupKey, { 
        results: [], 
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000 // Run cleanup once per day
      });
    }
  }

  /**
   * Force initialization of the vector store
   */
  async forceInitialize(): Promise<void> {
    console.log('🔄 Force initializing vector store...');
    this.initialized = false;
    await this.initializeVectorStore();
    
    if (this.initialized) {
      console.log('✅ Vector store force initialization successful');
    } else {
      console.error('❌ Vector store force initialization failed');
    }
  }

  /**
   * Get comprehensive user memory statistics
   */
  async getUserMemoryStats(userId: string): Promise<{
    totalMemories: number;
    memoryTypes: Record<string, number>;
    recentMemories: ExtractedMemory[];
    conversationCount: number;
  }> {
    if (!this.initialized) {
      return {
        totalMemories: 0,
        memoryTypes: {},
        recentMemories: [],
        conversationCount: 0
      };
    }

    try {
      const db = await this.getFirestoreClient();
      
      const [memoriesSnapshot, conversationsSnapshot] = await Promise.all([
        db.collection('user-memories').where('userId', '==', userId).get(),
        db.collection('user-vectors').where('userId', '==', userId).get()
      ]);

      const memoryTypes: Record<string, number> = {};
      const recentMemories: ExtractedMemory[] = [];

      memoriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        memoryTypes[data.type] = (memoryTypes[data.type] || 0) + 1;
        
        if (recentMemories.length < 5) {
          recentMemories.push({
            type: data.type,
            content: data.content,
            confidence: data.confidence,
            extractedFrom: data.extractedFrom,
            timestamp: data.timestamp?.toDate?.() || new Date()
          });
        }
      });

      return {
        totalMemories: memoriesSnapshot.size,
        memoryTypes,
        recentMemories: recentMemories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        conversationCount: conversationsSnapshot.size
      };
    } catch (error) {
      console.error('Failed to get user memory stats:', error);
      return {
        totalMemories: 0,
        memoryTypes: {},
        recentMemories: [],
        conversationCount: 0
      };
    }
  }

  /**
   * OPTIMIZATION 3: Process documents with efficient similarity calculation
   */
  private async processDocumentsForSimilarity(
    docs: any[],
    queryEmbedding: number[],
    query: string,
    topK: number
  ): Promise<MemoryResult[]> {
    const results: MemoryResult[] = [];
    const isProfileQuery = this.isProfileQuery(query);
    const similarityThreshold = isProfileQuery ? 0.05 : 0.15; // More lenient thresholds
    
    // Process in batches for better performance
    const batchSize = 5;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      
      for (const doc of batch) {
        const data = doc.data();
        if (!data.messages?.length) continue;

        // OPTIMIZATION: Filter and process messages more efficiently
        const relevantMessages = data.messages
          .filter((msg: any) => msg.embedding && msg.role !== 'system')
          .slice(0, 10); // Limit messages per conversation
        
        for (const message of relevantMessages) {
          const similarity = this.cosineSimilarity(queryEmbedding, message.embedding);
          
          if (similarity > similarityThreshold) {
            results.push({
              content: message.content,
              relevanceScore: similarity,
              conversationId: data.conversationId,
              timestamp: message.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
              model: message.model || 'unknown',
              messageId: message.messageId || message.id || 'unknown'
            });
          }
        }
        
        // Early exit optimization
        if (results.length >= topK * 4) break;
      }
      
      // Break if we have enough results
      if (results.length >= topK * 3) break;
    }
    
    return results;
  }

  /**
   * Cache search results for future use
   */
  private cacheResult(cacheKey: string, results: any): void {
    this.resultCache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries
    if (this.resultCache.size > this.cacheMaxSize / 2) {
      const oldestKeys = Array.from(this.resultCache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)
        .slice(0, 20)
        .map(([key]) => key);
      
      oldestKeys.forEach(key => this.resultCache.delete(key));
    }
  }

  /**
   * Update search performance metrics
   */
  private updateMetrics(duration: number): void {
    this.searchMetrics.avgLatency = (
      (this.searchMetrics.avgLatency * (this.searchMetrics.totalSearches - 1)) + duration
    ) / this.searchMetrics.totalSearches;
    
    const total = this.cacheHits + this.cacheMisses;
    this.searchMetrics.cacheHitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  /**
   * Check if query is asking about user profile
   */
  private isProfileQuery(query: string): boolean {
    const profileKeywords = [
      'who am i', 'what do you know about me', 'my profile', 'about me',
      'tell me about myself', 'ben kimim', 'hakkımda', 'personal information'
    ];
    
    const lowerQuery = query.toLowerCase();
    return profileKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Get search performance metrics
   */
  getSearchMetrics(): { totalSearches: number; avgLatency: number; cacheHitRate: number; cacheSize: number } {
    return {
      ...this.searchMetrics,
      cacheSize: this.resultCache.size + this.embeddingCache.size
    };
  }
} 