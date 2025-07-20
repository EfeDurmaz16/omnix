import Redis from 'ioredis';

interface MemoryLevel {
  name: string;
  retention: number; // seconds
  maxSize: number;
  decayRate: number;
}

interface TimedMemory {
  id: string;
  content: string;
  userId: string;
  chatId?: string;
  importance: number;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  level: string;
  embedding?: number[];
  metadata: {
    entities: string[];
    topics: string[];
    messageCount: number;
  };
}

interface ScoredMemory extends TimedMemory {
  score: number;
  decayFactor: number;
  accessBoost: number;
}

export class HierarchicalMemoryBank {
  private redis: Redis;
  private levels: Map<string, MemoryLevel> = new Map([
    ['immediate', { 
      name: 'immediate',
      retention: 300,      // 5 minutes
      maxSize: 100, 
      decayRate: 0.1 
    }],
    ['short-term', { 
      name: 'short-term',
      retention: 3600,     // 1 hour
      maxSize: 1000, 
      decayRate: 0.05 
    }],
    ['working', { 
      name: 'working',
      retention: 86400,    // 1 day
      maxSize: 5000, 
      decayRate: 0.02 
    }],
    ['long-term', { 
      name: 'long-term',
      retention: 604800,   // 1 week
      maxSize: 20000, 
      decayRate: 0.01 
    }],
    ['persistent', { 
      name: 'persistent',
      retention: Infinity, // Never expires
      maxSize: 100000, 
      decayRate: 0.005 
    }]
  ]);

  constructor() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });

      // Test connection
      this.redis.ping().catch(error => {
        console.warn('⚠️ Redis connection failed for hierarchical memory bank:', error.message);
      });

      // Start cleanup process
      this.startPeriodicCleanup();
    } catch (error) {
      console.error('❌ Failed to initialize Redis for hierarchical memory bank:', error);
    }
  }

  /**
   * Add memory to appropriate level based on importance and content
   */
  async addMemory(memory: Omit<TimedMemory, 'id' | 'timestamp' | 'lastAccessed' | 'accessCount' | 'level'>): Promise<string> {
    const now = Date.now();
    const memoryId = this.generateMemoryId();
    
    console.log(`🧠 Adding memory to hierarchical bank:`, {
      importance: memory.importance,
      contentLength: memory.content.length,
      entities: memory.metadata.entities.length
    });

    // Determine initial level based on importance
    const level = this.determineInitialLevel(memory.importance);
    
    const timedMemory: TimedMemory = {
      ...memory,
      id: memoryId,
      timestamp: now,
      lastAccessed: now,
      accessCount: 0,
      level: level.name
    };

    // Store in appropriate level
    await this.storeMemoryInLevel(level.name, timedMemory);
    
    // Check for promotion to higher levels
    await this.considerPromotion(timedMemory);
    
    console.log(`✅ Memory stored in ${level.name} level`);
    return memoryId;
  }

  /**
   * Retrieve memories with hierarchical decay and access-based boosting
   */
  async retrieveWithDecay(
    query: string,
    userId: string,
    options: {
      maxResults?: number;
      timeWindow?: number;
      includeExpired?: boolean;
    } = {}
  ): Promise<ScoredMemory[]> {
    const startTime = Date.now();
    const now = Date.now();
    const maxResults = options.maxResults || 20;
    
    console.log(`🔍 Hierarchical memory retrieval for user ${userId}`);

    // Check Redis connection
    if (!this.redis) {
      console.warn('⚠️ Redis not available for hierarchical memory retrieval');
      return [];
    }

    const allMemories: ScoredMemory[] = [];

    // Search all levels in parallel
    const levelSearches = Array.from(this.levels.keys()).map(async (levelName) => {
      const levelMemories = await this.searchLevel(levelName, query, userId);
      return { levelName, memories: levelMemories };
    });

    const levelResults = await Promise.all(levelSearches);

    // Process memories with decay and access patterns
    for (const { levelName, memories } of levelResults) {
      const level = this.levels.get(levelName)!;
      
      for (const memory of memories) {
        // Skip expired memories unless requested
        if (!options.includeExpired && this.isExpired(memory, level)) {
          continue;
        }

        // Calculate decay factor
        const age = now - memory.timestamp;
        const decayFactor = this.calculateDecayFactor(age, level);
        
        // Calculate access boost
        const accessBoost = this.calculateAccessBoost(memory);
        
        // Calculate relevance score (this would use embeddings in production)
        const relevanceScore = this.calculateRelevanceScore(query, memory);
        
        // Combine scores
        const finalScore = relevanceScore * decayFactor + accessBoost;

        allMemories.push({
          ...memory,
          score: finalScore,
          decayFactor,
          accessBoost
        });
      }
    }

    // Sort by final score and limit results
    const sortedMemories = allMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    // Update access patterns for retrieved memories
    await this.updateAccessPatterns(sortedMemories);

    console.log(`🔍 Hierarchical retrieval completed in ${Date.now() - startTime}ms:`, {
      totalLevels: this.levels.size,
      totalMemories: allMemories.length,
      returned: sortedMemories.length,
      topScore: sortedMemories[0]?.score.toFixed(3)
    });

    return sortedMemories;
  }

  /**
   * Promote important or frequently accessed memories to higher levels
   */
  async promoteMemory(memoryId: string, targetLevel?: string): Promise<boolean> {
    try {
      // Find memory in all levels
      const memory = await this.findMemoryInAllLevels(memoryId);
      if (!memory) {
        console.warn(`Memory ${memoryId} not found for promotion`);
        return false;
      }

      const currentLevel = this.levels.get(memory.level)!;
      
      // Determine target level
      const nextLevel = targetLevel ? 
        this.levels.get(targetLevel) : 
        this.getNextLevel(currentLevel);

      if (!nextLevel || nextLevel.name === currentLevel.name) {
        return false; // Already at highest appropriate level
      }

      console.log(`⬆️ Promoting memory from ${currentLevel.name} to ${nextLevel.name}`);

      // Move memory to higher level
      await this.moveMemoryBetweenLevels(memory, currentLevel.name, nextLevel.name);
      
      // Update memory metadata
      await this.updateMemoryLevel(memoryId, nextLevel.name);

      return true;
    } catch (error) {
      console.error(`❌ Failed to promote memory ${memoryId}:`, error);
      return false;
    }
  }

  /**
   * Consolidate similar memories across levels
   */
  async consolidateMemories(userId: string): Promise<number> {
    console.log(`🔄 Starting memory consolidation for user ${userId}`);
    
    let consolidatedCount = 0;
    
    // Get all memories for user
    const allMemories = await this.getAllUserMemories(userId);
    
    // Group by similarity (simplified - would use embeddings in production)
    const similarityGroups = this.groupBySimilarity(allMemories);
    
    for (const group of similarityGroups) {
      if (group.length > 1) {
        // Consolidate group into single memory
        const consolidated = await this.mergeMemories(group);
        
        // Remove original memories
        for (const memory of group) {
          await this.removeMemory(memory.id);
        }
        
        // Add consolidated memory
        await this.addMemory({
          content: consolidated.content,
          userId: consolidated.userId,
          chatId: consolidated.chatId,
          importance: consolidated.importance,
          embedding: consolidated.embedding,
          metadata: consolidated.metadata
        });
        
        consolidatedCount += group.length - 1;
      }
    }

    console.log(`✅ Consolidated ${consolidatedCount} memories for user ${userId}`);
    return consolidatedCount;
  }

  /**
   * Private helper methods
   */
  private determineInitialLevel(importance: number): MemoryLevel {
    if (importance >= 0.9) return this.levels.get('persistent')!;
    if (importance >= 0.7) return this.levels.get('long-term')!;
    if (importance >= 0.5) return this.levels.get('working')!;
    if (importance >= 0.3) return this.levels.get('short-term')!;
    return this.levels.get('immediate')!;
  }

  private async storeMemoryInLevel(levelName: string, memory: TimedMemory): Promise<void> {
    const key = `memory:${levelName}:${memory.userId}:${memory.id}`;
    await this.redis.setex(key, this.levels.get(levelName)!.retention, JSON.stringify(memory));
    
    // Add to level index
    const indexKey = `index:${levelName}:${memory.userId}`;
    await this.redis.zadd(indexKey, memory.timestamp, memory.id);
  }

  private async searchLevel(levelName: string, query: string, userId: string): Promise<TimedMemory[]> {
    try {
      const indexKey = `index:${levelName}:${userId}`;
      const memoryIds = await this.redis.zrevrange(indexKey, 0, -1);
      
      const memories: TimedMemory[] = [];
      
      for (const memoryId of memoryIds) {
        const key = `memory:${levelName}:${userId}:${memoryId}`;
        const memoryData = await this.redis.get(key);
        
        if (memoryData) {
          const memory = JSON.parse(memoryData) as TimedMemory;
          memories.push(memory);
        }
      }
      
      return memories;
    } catch (error) {
      console.error(`❌ Error searching level ${levelName}:`, error);
      return [];
    }
  }

  private calculateDecayFactor(age: number, level: MemoryLevel): number {
    if (level.retention === Infinity) {
      // Persistent memories decay very slowly
      return Math.max(0.1, Math.exp(-age / (365 * 24 * 60 * 60 * 1000))); // 1 year half-life
    }
    
    // Exponential decay based on retention time
    const halfLife = level.retention * 1000 * 2; // Half-life is 2x retention time
    return Math.exp(-age / halfLife);
  }

  private calculateAccessBoost(memory: TimedMemory): number {
    // Logarithmic boost based on access count
    const accessBoost = Math.log(memory.accessCount + 1) * 0.1;
    
    // Recent access boost
    const now = Date.now();
    const timeSinceAccess = now - memory.lastAccessed;
    const recentAccessBoost = Math.exp(-timeSinceAccess / (24 * 60 * 60 * 1000)) * 0.2; // 1 day decay
    
    return accessBoost + recentAccessBoost;
  }

  private calculateRelevanceScore(query: string, memory: TimedMemory): number {
    // Simple text similarity (would use embeddings in production)
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const memoryWords = new Set(memory.content.toLowerCase().split(/\s+/));
    const intersection = new Set([...queryWords].filter(x => memoryWords.has(x)));
    
    const textSimilarity = queryWords.size > 0 ? intersection.size / queryWords.size : 0;
    
    // Boost based on importance
    const importanceBoost = memory.importance * 0.3;
    
    return Math.min(1.0, textSimilarity + importanceBoost);
  }

  private async updateAccessPatterns(memories: ScoredMemory[]): Promise<void> {
    const now = Date.now();
    
    for (const memory of memories) {
      const key = `memory:${memory.level}:${memory.userId}:${memory.id}`;
      
      // Update access count and timestamp
      memory.accessCount++;
      memory.lastAccessed = now;
      
      // Store updated memory
      await this.redis.setex(
        key, 
        this.levels.get(memory.level)!.retention, 
        JSON.stringify(memory)
      );
    }
  }

  private async considerPromotion(memory: TimedMemory): Promise<void> {
    // Promote if high importance or frequent access
    if (memory.importance > 0.8 || memory.accessCount > 10) {
      await this.promoteMemory(memory.id);
    }
  }

  private isExpired(memory: TimedMemory, level: MemoryLevel): boolean {
    if (level.retention === Infinity) return false;
    
    const now = Date.now();
    const age = now - memory.timestamp;
    return age > level.retention * 1000;
  }

  private getNextLevel(currentLevel: MemoryLevel): MemoryLevel | null {
    const levelOrder = ['immediate', 'short-term', 'working', 'long-term', 'persistent'];
    const currentIndex = levelOrder.indexOf(currentLevel.name);
    
    if (currentIndex < levelOrder.length - 1) {
      return this.levels.get(levelOrder[currentIndex + 1]) || null;
    }
    
    return null;
  }

  private async findMemoryInAllLevels(memoryId: string): Promise<TimedMemory | null> {
    for (const levelName of this.levels.keys()) {
      // This is simplified - in production you'd have a global index
      const pattern = `memory:${levelName}:*:${memoryId}`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        const memoryData = await this.redis.get(keys[0]);
        if (memoryData) {
          return JSON.parse(memoryData) as TimedMemory;
        }
      }
    }
    
    return null;
  }

  private async moveMemoryBetweenLevels(
    memory: TimedMemory, 
    fromLevel: string, 
    toLevel: string
  ): Promise<void> {
    // Remove from old level
    const oldKey = `memory:${fromLevel}:${memory.userId}:${memory.id}`;
    const oldIndexKey = `index:${fromLevel}:${memory.userId}`;
    
    await this.redis.del(oldKey);
    await this.redis.zrem(oldIndexKey, memory.id);
    
    // Add to new level
    memory.level = toLevel;
    await this.storeMemoryInLevel(toLevel, memory);
  }

  private async updateMemoryLevel(memoryId: string, newLevel: string): Promise<void> {
    // Update level in memory object
    // This would be handled by the move operation
  }

  private async getAllUserMemories(userId: string): Promise<TimedMemory[]> {
    const allMemories: TimedMemory[] = [];
    
    for (const levelName of this.levels.keys()) {
      const levelMemories = await this.searchLevel(levelName, '', userId);
      allMemories.push(...levelMemories);
    }
    
    return allMemories;
  }

  private groupBySimilarity(memories: TimedMemory[]): TimedMemory[][] {
    // Simplified similarity grouping
    // In production, this would use embedding similarity
    const groups: TimedMemory[][] = [];
    const used = new Set<string>();
    
    for (const memory of memories) {
      if (used.has(memory.id)) continue;
      
      const similarMemories = [memory];
      used.add(memory.id);
      
      for (const other of memories) {
        if (used.has(other.id)) continue;
        
        // Simple content similarity check
        if (this.areSimilar(memory.content, other.content)) {
          similarMemories.push(other);
          used.add(other.id);
        }
      }
      
      groups.push(similarMemories);
    }
    
    return groups;
  }

  private areSimilar(content1: string, content2: string): boolean {
    // Simple similarity check - would use embeddings in production
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 && intersection.size / union.size > 0.7;
  }

  private async mergeMemories(memories: TimedMemory[]): Promise<TimedMemory> {
    // Merge similar memories into one
    const merged = memories[0];
    
    // Combine content
    const contents = memories.map(m => m.content);
    merged.content = contents.join('\n\n[Merged Memory]\n');
    
    // Update importance (take max)
    merged.importance = Math.max(...memories.map(m => m.importance));
    
    // Combine entities and topics
    const allEntities = memories.flatMap(m => m.metadata.entities);
    const allTopics = memories.flatMap(m => m.metadata.topics);
    
    merged.metadata.entities = [...new Set(allEntities)];
    merged.metadata.topics = [...new Set(allTopics)];
    merged.metadata.messageCount = memories.reduce((sum, m) => sum + m.metadata.messageCount, 0);
    
    return merged;
  }

  private async removeMemory(memoryId: string): Promise<void> {
    // Remove from all levels - simplified
    for (const levelName of this.levels.keys()) {
      const pattern = `memory:${levelName}:*:${memoryId}`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(keys[0]);
        
        // Also remove from index
        const userId = keys[0].split(':')[2];
        const indexKey = `index:${levelName}:${userId}`;
        await this.redis.zrem(indexKey, memoryId);
      }
    }
  }

  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicCleanup(): void {
    // Clean up expired memories every hour
    setInterval(async () => {
      await this.cleanupExpiredMemories();
    }, 60 * 60 * 1000);
  }

  private async cleanupExpiredMemories(): Promise<void> {
    console.log('🧹 Starting periodic memory cleanup');
    
    for (const [levelName, level] of this.levels) {
      if (level.retention === Infinity) continue;
      
      const pattern = `memory:${levelName}:*`;
      const keys = await this.redis.keys(pattern);
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
        }
      }
    }
  }
}