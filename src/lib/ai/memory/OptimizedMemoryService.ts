import { Redis } from 'ioredis';
import { AdvancedContextManager } from '../../context/AdvancedContextManager';
import { AdvancedContextCompression } from '../context/AdvancedContextCompression';
import { HierarchicalMemoryBank } from './HierarchicalMemoryBank';
import { logger } from '../../utils/logger';

export interface OptimizedMemory {
  id: string;
  userId: string;
  chatId?: string;
  content: string;
  type: 'preference' | 'fact' | 'skill' | 'goal' | 'context';
  importance: number; // 0-1 score
  embedding?: number[];
  entities: string[];
  topics: string[];
  timestamp: Date;
  lastUsed: Date;
  useCount: number;
  consolidatedFrom?: string[]; // IDs of memories this was created from
}

export interface MemoryContext {
  conversationMemories: OptimizedMemory[];
  userMemories: OptimizedMemory[];
  relevanceScores: Map<string, number>;
  totalTokens: number;
  cacheHit: boolean;
  retrievalTime: number;
}

export class OptimizedMemoryService {
  private redis: Redis | null = null;
  private redisAvailable = false;
  private contextManager: AdvancedContextManager;
  private compression: AdvancedContextCompression;
  private memoryBank: HierarchicalMemoryBank;
  
  private readonly CACHE_TTL = {
    conversation: 3600,    // 1 hour
    userSummary: 86400,   // 24 hours  
    recentMemories: 7200, // 2 hours
    embeddings: 604800    // 1 week
  };

  private readonly MEMORY_BUDGET = {
    conversation: 1000,  // tokens
    userContext: 1500,   // tokens
    total: 2500         // tokens
  };

  constructor(contextManager: AdvancedContextManager) {
    this.contextManager = contextManager;
    this.compression = new AdvancedContextCompression();
    this.memoryBank = new HierarchicalMemoryBank();
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        enableAutoPipelining: true,
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 2000,
      });

      // Test connection silently
      await this.redis.ping();
      this.redisAvailable = true;
      console.log('✅ Redis L2 cache connected successfully');
    } catch (error) {
      this.redisAvailable = false;
      console.warn('⚠️ Redis unavailable - using L1 cache only (still fast!)');
      if (this.redis) {
        this.redis.disconnect();
        this.redis = null;
      }
    }
  }

  async getOptimizedMemories(
    userId: string,
    chatId: string,
    query: string,
    memoryBudget: number = this.MEMORY_BUDGET.total
  ): Promise<MemoryContext> {
    const startTime = Date.now();
    
    // L1 Cache: Check for immediate conversation context
    const conversationContext = await this.getCachedConversationContext(chatId);
    
    // L2 Cache: Check for recent user memories
    let userMemories = await this.getCachedUserMemories(userId);
    
    // L2.5: If no cached memories, try to get from existing context manager
    if (!userMemories || userMemories.length === 0) {
      console.log('🔄 No cached memories found, retrieving from context manager...');
      userMemories = await this.getMemoriesFromContextManager(userId, query);
    }
    
    // If we have sufficient cached data, return early
    if (conversationContext && userMemories && userMemories.length > 0 && this.hasEnoughContext(conversationContext, userMemories, query)) {
      console.log(`✅ Using cached data: ${conversationContext.length} conversation + ${userMemories.length} user memories`);
      return {
        conversationMemories: conversationContext,
        userMemories: userMemories.slice(0, 10),
        relevanceScores: new Map(),
        totalTokens: this.calculateTokens(conversationContext, userMemories),
        cacheHit: true,
        retrievalTime: Date.now() - startTime
      };
    }

    // L3 Storage: Use existing working memory system (temporarily disable new system)
    console.log('🔄 Using existing memory system (advanced features temporarily disabled)');
    
    // Fall back to original working retrieval
    const vectorResults = await this.performOptimizedVectorSearch(userId, query, memoryBudget).catch(error => {
      console.warn('⚠️ Vector search failed, using fallback:', error.message);
      return [];
    });
    
    // Post-process and consolidate memories (original logic)
    const consolidatedMemories = await this.consolidateMemories(vectorResults);
    
    // Rerank based on recency, importance, and relevance
    const rankedMemories = await this.rerankMemories(query, consolidatedMemories);
    
    // Fit within memory budget
    const { conversation, user } = this.fitMemoriesInBudget(rankedMemories, memoryBudget);
    
    // Update caches asynchronously (fire-and-forget)
    this.updateCachesAsync(userId, chatId, conversation, user);
    
    // Update usage statistics
    this.updateMemoryUsageStats(rankedMemories);

    return {
      conversationMemories: conversation,
      userMemories: user,
      relevanceScores: this.buildRelevanceMap(rankedMemories),
      totalTokens: this.calculateTokens(conversation, user),
      cacheHit: false,
      retrievalTime: Date.now() - startTime
    };
  }

  private async getCachedConversationContext(chatId: string): Promise<OptimizedMemory[] | null> {
    try {
      if (!this.redis || !this.redisAvailable) {
        return null; // Use L1 cache only
      }
      const cached = await this.redis.get(`chat:${chatId}:context`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache read error for conversation context:', error);
      return null;
    }
  }

  private async getCachedUserMemories(userId: string): Promise<OptimizedMemory[] | null> {
    try {
      if (!this.redis || !this.redisAvailable) {
        return null; // Use L1 cache only
      }
      const cached = await this.redis.get(`user:${userId}:memories`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache read error for user memories:', error);
      return null;
    }
  }

  private hasEnoughContext(
    conversationContext: OptimizedMemory[], 
    userMemories: OptimizedMemory[], 
    query: string
  ): boolean {
    // Check if we have recent memories and they cover the query topic
    const totalMemories = conversationContext.length + userMemories.length;
    if (totalMemories < 3) return false;

    // Check recency - if latest memory is older than 1 hour, refresh
    const latestMemory = [...conversationContext, ...userMemories]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
    if (!latestMemory || Date.now() - latestMemory.timestamp.getTime() > 3600000) {
      return false;
    }

    // Check topic relevance using simple keyword matching
    const queryWords = query.toLowerCase().split(/\s+/);
    const memoryTopics = [...conversationContext, ...userMemories]
      .flatMap(m => m.topics.map(t => t.toLowerCase()));
    
    const overlap = queryWords.filter(word => 
      memoryTopics.some(topic => topic.includes(word) || word.includes(topic))
    );
    
    return overlap.length >= Math.min(2, queryWords.length * 0.3);
  }

  private async performOptimizedVectorSearch(
    userId: string, 
    query: string, 
    budget: number
  ): Promise<OptimizedMemory[]> {
    try {
      logger.debug('Performing vector search via context manager', {
        component: 'memory',
        userId: userId.substring(0, 12) + '...',
        query: query.substring(0, 50) + '...',
        budget
      });
      
      // Use the existing context manager for memory retrieval
      const memoryResults = await this.contextManager.getUserContexts(userId);
      const optimizedMemories: OptimizedMemory[] = [];
      
      // Convert existing context to optimized memories
      for (const context of memoryResults.slice(0, 3)) { // Limit to recent contexts
        for (const message of context.messages.slice(-10)) { // Recent messages
          if (message.role === 'user' || message.role === 'assistant') {
            optimizedMemories.push({
              id: message.id,
              userId,
              chatId: context.id,
              content: message.content,
              type: 'context',
              importance: 0.7,
              entities: this.extractSimpleEntities(message.content),
              topics: this.extractSimpleTopics(message.content),
              timestamp: message.timestamp,
              lastUsed: new Date(),
              useCount: 1
            });
          }
        }
      }
      
      logger.debug('Vector search completed', {
        component: 'memory',
        foundMemories: optimizedMemories.length
      });
      
      return optimizedMemories;
    } catch (error) {
      logger.error('Vector search error', { component: 'memory' }, error);
      return [];
    }
  }

  private convertContextToOptimizedMemories(context: any, userId: string): OptimizedMemory[] {
    const memories: OptimizedMemory[] = [];
    
    // Process different types of context
    if (context.userMemories) {
      for (const memory of context.userMemories) {
        memories.push({
          id: memory.id || `mem_${Date.now()}_${Math.random()}`,
          userId,
          content: memory.content || memory.summary,
          type: this.mapMemoryType(memory.type),
          importance: memory.importance || 0.5,
          entities: memory.entities || [],
          topics: memory.topics || [],
          timestamp: new Date(memory.timestamp || Date.now()),
          lastUsed: new Date(),
          useCount: memory.useCount || 1
        });
      }
    }

    if (context.conversationContext) {
      for (const ctx of context.conversationContext) {
        memories.push({
          id: ctx.id || `ctx_${Date.now()}_${Math.random()}`,
          userId,
          chatId: ctx.chatId,
          content: ctx.content || ctx.summary,
          type: 'context',
          importance: ctx.importance || 0.7,
          entities: ctx.entities || [],
          topics: ctx.topics || [],
          timestamp: new Date(ctx.timestamp || Date.now()),
          lastUsed: new Date(),
          useCount: ctx.useCount || 1
        });
      }
    }

    return memories;
  }

  private mapMemoryType(type: string): OptimizedMemory['type'] {
    const mapping: Record<string, OptimizedMemory['type']> = {
      'preference': 'preference',
      'fact': 'fact', 
      'skill': 'skill',
      'goal': 'goal',
      'context': 'context'
    };
    return mapping[type] || 'fact';
  }

  private async consolidateMemories(memories: OptimizedMemory[]): Promise<OptimizedMemory[]> {
    // Group similar memories by content similarity and entities
    const groups = this.groupSimilarMemories(memories);
    const consolidated: OptimizedMemory[] = [];

    for (const group of groups) {
      if (group.length === 1) {
        consolidated.push(group[0]);
      } else {
        // Consolidate multiple memories into one
        const consolidatedMemory = await this.mergeMemories(group);
        consolidated.push(consolidatedMemory);
      }
    }

    return consolidated;
  }

  private groupSimilarMemories(memories: OptimizedMemory[]): OptimizedMemory[][] {
    const groups: OptimizedMemory[][] = [];
    const processed = new Set<string>();

    for (const memory of memories) {
      if (processed.has(memory.id)) continue;

      const group = [memory];
      processed.add(memory.id);

      // Find similar memories
      for (const other of memories) {
        if (processed.has(other.id)) continue;

        if (this.areMemoriesSimilar(memory, other)) {
          group.push(other);
          processed.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private areMemoriesSimilar(a: OptimizedMemory, b: OptimizedMemory): boolean {
    // Check entity overlap
    const entityOverlap = a.entities.filter(e => b.entities.includes(e)).length;
    const entitySimilarity = entityOverlap / Math.max(a.entities.length, b.entities.length, 1);

    // Check topic overlap  
    const topicOverlap = a.topics.filter(t => b.topics.includes(t)).length;
    const topicSimilarity = topicOverlap / Math.max(a.topics.length, b.topics.length, 1);

    // Check content similarity (simple word overlap)
    const aWords = new Set(a.content.toLowerCase().split(/\s+/));
    const bWords = new Set(b.content.toLowerCase().split(/\s+/));
    const contentOverlap = [...aWords].filter(w => bWords.has(w)).length;
    const contentSimilarity = contentOverlap / Math.max(aWords.size, bWords.size, 1);

    // Consider similar if any similarity measure is high
    return entitySimilarity > 0.6 || topicSimilarity > 0.6 || contentSimilarity > 0.4;
  }

  private async mergeMemories(memories: OptimizedMemory[]): Promise<OptimizedMemory> {
    // Combine content intelligently
    const sortedByImportance = memories.sort((a, b) => b.importance - a.importance);
    const primary = sortedByImportance[0];

    // Merge entities and topics
    const allEntities = [...new Set(memories.flatMap(m => m.entities))];
    const allTopics = [...new Set(memories.flatMap(m => m.topics))];

    // Combine content with importance weighting
    const combinedContent = this.combineContent(memories);

    return {
      ...primary,
      id: `consolidated_${Date.now()}_${Math.random()}`,
      content: combinedContent,
      entities: allEntities,
      topics: allTopics,
      importance: Math.max(...memories.map(m => m.importance)),
      useCount: memories.reduce((sum, m) => sum + m.useCount, 0),
      consolidatedFrom: memories.map(m => m.id),
      lastUsed: new Date(),
      timestamp: new Date(Math.max(...memories.map(m => m.timestamp.getTime())))
    };
  }

  private combineContent(memories: OptimizedMemory[]): string {
    // Sort by importance and recency
    const sorted = memories.sort((a, b) => {
      const importanceScore = b.importance - a.importance;
      const recencyScore = (b.timestamp.getTime() - a.timestamp.getTime()) / 86400000; // days
      return importanceScore + recencyScore * 0.1;
    });

    // Take top content pieces, avoiding redundancy
    const uniqueContent = new Set<string>();
    const sentences = sorted.flatMap(m => 
      m.content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10)
    );

    for (const sentence of sentences) {
      if (uniqueContent.size >= 3) break; // Limit to 3 key points
      
      // Check if this sentence adds new information
      const existing = [...uniqueContent];
      const similarity = existing.some(existing => 
        this.calculateStringSimilarity(sentence, existing) > 0.7
      );
      
      if (!similarity) {
        uniqueContent.add(sentence);
      }
    }

    return [...uniqueContent].join('. ') + '.';
  }

  private calculateStringSimilarity(a: string, b: string): number {
    const aWords = new Set(a.toLowerCase().split(/\s+/));
    const bWords = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...aWords].filter(w => bWords.has(w)).length;
    const union = new Set([...aWords, ...bWords]).size;
    return intersection / union;
  }

  private async rerankMemories(
    query: string, 
    memories: OptimizedMemory[]
  ): Promise<OptimizedMemory[]> {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const now = Date.now();

    return memories.map(memory => {
      // Calculate relevance score
      const contentWords = new Set(memory.content.toLowerCase().split(/\s+/));
      const contentRelevance = [...queryWords].filter(w => contentWords.has(w)).length / queryWords.size;
      
      const entityRelevance = memory.entities.some(e => 
        query.toLowerCase().includes(e.toLowerCase())
      ) ? 0.3 : 0;
      
      const topicRelevance = memory.topics.some(t => 
        queryWords.has(t.toLowerCase())
      ) ? 0.2 : 0;

      // Calculate recency score (decay over time)
      const ageHours = (now - memory.timestamp.getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.exp(-ageHours / 24); // Exponential decay with 24h half-life

      // Calculate usage score
      const usageScore = Math.min(memory.useCount / 10, 1); // Cap at 10 uses

      // Combined score
      const relevanceScore = (contentRelevance * 0.4) + (entityRelevance * 0.3) + (topicRelevance * 0.3);
      const finalScore = (relevanceScore * 0.5) + (memory.importance * 0.3) + (recencyScore * 0.15) + (usageScore * 0.05);

      return {
        ...memory,
        relevanceScore: finalScore
      };
    }).sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore);
  }

  private fitMemoriesInBudget(
    memories: OptimizedMemory[], 
    budget: number
  ): { conversation: OptimizedMemory[], user: OptimizedMemory[] } {
    const conversationMems: OptimizedMemory[] = [];
    const userMems: OptimizedMemory[] = [];
    
    let conversationTokens = 0;
    let userTokens = 0;

    for (const memory of memories) {
      const tokens = this.estimateTokens(memory.content);
      
      if (memory.type === 'context' && memory.chatId) {
        if (conversationTokens + tokens <= this.MEMORY_BUDGET.conversation) {
          conversationMems.push(memory);
          conversationTokens += tokens;
        }
      } else {
        if (userTokens + tokens <= this.MEMORY_BUDGET.userContext) {
          userMems.push(memory);
          userTokens += tokens;
        }
      }

      // Stop if we've exceeded total budget
      if (conversationTokens + userTokens >= budget) break;
    }

    return { conversation: conversationMems, user: userMems };
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateTokens(conversation: OptimizedMemory[], user: OptimizedMemory[]): number {
    const convTokens = conversation.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
    const userTokens = user.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
    return convTokens + userTokens;
  }

  private buildRelevanceMap(memories: OptimizedMemory[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const memory of memories) {
      if ((memory as any).relevanceScore) {
        map.set(memory.id, (memory as any).relevanceScore);
      }
    }
    return map;
  }

  private async updateCachesAsync(
    userId: string,
    chatId: string,
    conversation: OptimizedMemory[],
    user: OptimizedMemory[]
  ): Promise<void> {
    // Only update Redis cache if available
    if (!this.redis || !this.redisAvailable) {
      return; // Skip Redis updates, use L1 cache only
    }

    // Fire-and-forget cache updates
    Promise.all([
      this.redis.setex(
        `chat:${chatId}:context`,
        this.CACHE_TTL.conversation,
        JSON.stringify(conversation)
      ),
      this.redis.setex(
        `user:${userId}:memories`,
        this.CACHE_TTL.recentMemories,
        JSON.stringify(user)
      )
    ]).catch(error => {
      console.error('Cache update failed:', error);
    });
  }

  private updateMemoryUsageStats(memories: OptimizedMemory[]): void {
    // Update usage statistics in background
    Promise.resolve().then(async () => {
      for (const memory of memories) {
        memory.lastUsed = new Date();
        memory.useCount += 1;
        
        // Store updated stats (you could batch these)
        // await this.persistMemoryStats(memory);
      }
    }).catch(error => {
      console.error('Memory stats update failed:', error);
    });
  }

  // Public methods for external use
  async preWarmCache(userId: string, chatId: string): Promise<void> {
    // Pre-load frequently accessed memories
    const commonQueries = ['preferences', 'recent activity', 'goals'];
    
    for (const query of commonQueries) {
      this.getOptimizedMemories(userId, chatId, query, 1000)
        .catch(error => console.error('Cache pre-warming failed:', error));
    }
  }

  async clearUserCache(userId: string): Promise<void> {
    const pattern = `user:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Remove duplicate memories based on content similarity
   */
  private deduplicateMemories(memories: any[]): any[] {
    const unique: any[] = [];
    const seen = new Set<string>();

    for (const memory of memories) {
      // Create a simple hash for deduplication
      const contentHash = this.createContentHash(memory.content);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        unique.push(memory);
      }
    }

    console.log(`🔄 Deduplicated ${memories.length} → ${unique.length} memories`);
    return unique;
  }

  /**
   * Parse compressed context back into structured format
   */
  private parseCompressedContext(compressionResult: any): any[] {
    // For now, create a single memory object from compressed content
    // In production, you'd have more sophisticated parsing
    return [{
      id: `compressed_${Date.now()}`,
      content: compressionResult.content,
      metadata: {
        timestamp: new Date(),
        importance: 0.9, // Compressed content is important
        entities: compressionResult.preservedEntities || [],
        topics: [],
        compressed: true,
        originalTokens: compressionResult.originalTokens,
        compressionRatio: compressionResult.compressionRatio
      }
    }];
  }

  /**
   * Create content hash for deduplication
   */
  private createContentHash(content: string): string {
    // Simple hash function for content deduplication
    const normalized = content.toLowerCase().trim().replace(/\s+/g, ' ');
    let hash = 0;
    
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Store memory in hierarchical memory bank
   */
  async storeInHierarchicalBank(
    userId: string,
    chatId: string,
    content: string,
    importance: number,
    metadata: any
  ): Promise<void> {
    try {
      await this.memoryBank.addMemory({
        content,
        userId,
        chatId,
        importance,
        metadata: {
          entities: metadata.entities || [],
          topics: metadata.topics || [],
          messageCount: metadata.messageCount || 1
        }
      });
      
      console.log(`💾 Memory stored in hierarchical bank with importance: ${importance}`);
    } catch (error) {
      console.error('❌ Failed to store in hierarchical bank:', error);
    }
  }

  /**
   * Retrieve memories from existing context manager system
   */
  private async getMemoriesFromContextManager(userId: string, query: string): Promise<OptimizedMemory[]> {
    try {
      logger.debug('Searching existing memory system for user', {
        component: 'memory',
        userId: userId.substring(0, 12) + '...',
        query: query.substring(0, 50) + '...'
      });
      
      // Get user contexts from the context manager
      const userContexts = await this.contextManager.getUserContexts(userId);
      const memories: OptimizedMemory[] = [];
      
      // Convert recent conversations to optimized memories
      for (const context of userContexts.slice(0, 2)) { // Last 2 conversations
        for (const message of context.messages.slice(-5)) { // Last 5 messages per conversation
          if (message.role === 'user' || message.role === 'assistant') {
            // Check if this message is relevant to the query
            const isRelevant = this.isMessageRelevantToQuery(message.content, query);
            
            if (isRelevant) {
              memories.push({
                id: message.id,
                userId,
                chatId: context.id,
                content: message.content,
                type: message.role === 'user' ? 'context' : 'context',
                importance: 0.8,
                entities: this.extractSimpleEntities(message.content),
                topics: this.extractSimpleTopics(message.content),
                timestamp: message.timestamp,
                lastUsed: new Date(),
                useCount: 1
              });
            }
          }
        }
      }
      
      logger.debug('Memory retrieval from context manager completed', {
        component: 'memory',
        foundMemories: memories.length
      });
      
      return memories;
      
    } catch (error) {
      logger.error('Failed to retrieve from context manager', { component: 'memory' }, error);
      return [];
    }
  }

  async getMemoryStats(userId: string): Promise<any> {
    const userMemories = await this.getCachedUserMemories(userId);
    
    return {
      totalMemories: userMemories?.length || 0,
      cacheHitRate: await this.getCacheHitRate(userId),
      averageRetrievalTime: await this.getAverageRetrievalTime(userId),
      memoryTypes: this.getMemoryTypeDistribution(userMemories || [])
    };
  }

  private async getCacheHitRate(userId: string): Promise<number> {
    // Implementation would track cache hits vs misses
    return 0.75; // Mock value
  }

  private async getAverageRetrievalTime(userId: string): Promise<number> {
    // Implementation would track retrieval times
    return 250; // Mock value in ms
  }

  private getMemoryTypeDistribution(memories: OptimizedMemory[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const memory of memories) {
      distribution[memory.type] = (distribution[memory.type] || 0) + 1;
    }
    
    return distribution;
  }

  private extractSimpleEntities(text: string): string[] {
    const entities = [];
    
    // Extract names (capitalized words)
    const names = text.match(/\b[A-Z][a-z]+\b/g) || [];
    entities.push(...names);
    
    // Extract emails
    const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\\b/g) || [];
    entities.push(...emails);
    
    // Extract numbers/dates
    const numbers = text.match(/\b\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) || [];
    entities.push(...numbers);
    
    return [...new Set(entities)];
  }

  private extractSimpleTopics(text: string): string[] {
    const topics = [];
    
    // Common programming topics
    const programmingTerms = ['javascript', 'python', 'react', 'api', 'database', 'server', 'client', 'function', 'variable', 'array', 'object'];
    programmingTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        topics.push(term);
      }
    });
    
    // Common business topics
    const businessTerms = ['project', 'meeting', 'deadline', 'budget', 'team', 'client', 'product', 'service'];
    businessTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        topics.push(term);
      }
    });
    
    return [...new Set(topics)];
  }

  private isMessageRelevantToQuery(messageContent: string, query: string): boolean {
    // Simple relevance check using keyword matching
    const messageWords = new Set(messageContent.toLowerCase().split(/\s+/));
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    
    // Calculate word overlap
    const overlap = [...queryWords].filter(word => messageWords.has(word)).length;
    const relevanceScore = overlap / queryWords.size;
    
    // Personal information is always relevant
    const personalKeywords = ['name', 'age', 'live', 'work', 'study', 'like', 'prefer', 'want', 'need'];
    const hasPersonalInfo = personalKeywords.some(keyword => 
      messageContent.toLowerCase().includes(keyword)
    );
    
    // Profile queries should match personal information
    const isProfileQuery = ['who am i', 'about me', 'what do you know'].some(phrase =>
      query.toLowerCase().includes(phrase)
    );
    
    if (isProfileQuery && hasPersonalInfo) {
      return true;
    }
    
    // Return true if relevance score is above threshold
    return relevanceScore > 0.1 || hasPersonalInfo;
  }
}