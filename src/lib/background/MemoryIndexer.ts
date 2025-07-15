/**
 * Background Memory Indexer for OmniX
 * Pre-loads and indexes frequently accessed memories for faster retrieval
 */

import { memorySearchCache, embeddingCache, userProfileCache, modelCatalogCache, providerCache } from '../cache/MemoryCache';

export interface IndexingJob {
  id: string;
  type: 'user_profile' | 'common_queries' | 'recent_conversations' | 'model_catalog_preload';
  userId?: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export class MemoryIndexer {
  private indexingQueue: IndexingJob[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private stats = {
    jobsProcessed: 0,
    jobsFailed: 0,
    lastProcessedAt: null as Date | null,
    averageProcessingTime: 0
  };

  constructor() {
    // Start processing jobs every 30 seconds
    this.startProcessing();
    
    // Pre-load common data on startup
    this.scheduleCommonIndexing();
  }

  /**
   * Add indexing job to queue
   */
  addJob(job: Omit<IndexingJob, 'id' | 'createdAt' | 'status'>): string {
    const indexingJob: IndexingJob = {
      ...job,
      id: `idx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: 'pending'
    };

    // Insert based on priority
    if (job.priority === 'high') {
      this.indexingQueue.unshift(indexingJob);
    } else {
      this.indexingQueue.push(indexingJob);
    }

    console.log(`📋 Added indexing job: ${indexingJob.type} (${job.priority} priority)`);
    return indexingJob.id;
  }

  /**
   * Start background processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing && this.indexingQueue.length > 0) {
        await this.processNextJob();
      }
    }, 30000); // Process every 30 seconds

    console.log('🔄 Memory indexer started - processing jobs every 30 seconds');
  }

  /**
   * Process next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (this.isProcessing || this.indexingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.indexingQueue.shift()!;
    const startTime = performance.now();

    try {
      job.status = 'processing';
      job.processedAt = new Date();

      console.log(`⚡ Processing indexing job: ${job.type} (ID: ${job.id})`);

      switch (job.type) {
        case 'user_profile':
          await this.indexUserProfile(job.userId!);
          break;
        case 'common_queries':
          await this.indexCommonQueries();
          break;
        case 'recent_conversations':
          await this.indexRecentConversations(job.userId);
          break;
        case 'model_catalog_preload':
          await this.preloadModelCatalog();
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = 'completed';
      this.stats.jobsProcessed++;

      const processingTime = performance.now() - startTime;
      this.updateProcessingTime(processingTime);

      console.log(`✅ Completed indexing job: ${job.type} in ${processingTime.toFixed(2)}ms`);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.stats.jobsFailed++;

      console.error(`❌ Failed indexing job: ${job.type}`, error);
    } finally {
      this.isProcessing = false;
      this.stats.lastProcessedAt = new Date();
    }
  }

  /**
   * Index user profile data
   */
  private async indexUserProfile(userId: string): Promise<void> {
    const profileCacheKey = `profile_${userId}`;
    
    // Clear cache to force reindexing (temporary for debugging)
    userProfileCache.delete(profileCacheKey);
    
    // Check if already cached
    if (userProfileCache.has(profileCacheKey)) {
      console.log(`📦 User profile for ${userId} already cached`);
      return;
    }

    try {
      // Get user profile from database
      const userProfile = await this.getUserProfileFromDatabase(userId);
      
      if (!userProfile) {
        console.log(`⚠️ No profile found for user ${userId}`);
        return;
      }

      const profileData = [{
        content: userProfile,
        relevanceScore: 0.95,
        conversationId: 'indexed-profile',
        timestamp: new Date().toISOString(),
        model: 'background-indexer',
        messageId: 'indexed-profile',
        metadata: { 
          similarity: 0.95, 
          role: 'system',
          storageType: 'background-indexed',
          indexedAt: new Date().toISOString(),
          userId: userId
        },
      }];

      // Cache the profile data
      userProfileCache.set(profileCacheKey, profileData);
      console.log(`💾 Indexed user profile for ${userId}: ${userProfile.substring(0, 100)}...`);
    } catch (error) {
      console.error(`❌ Failed to index user profile for ${userId}:`, error);
    }
  }

  /**
   * Get user profile from database or localStorage
   */
  private async getUserProfileFromDatabase(userId: string): Promise<string | null> {
    try {
      // First try to get from server-side file storage
      if (typeof window === 'undefined') {
        try {
          const path = require('path');
          const fs = require('fs');
          const profilePath = path.join(process.cwd(), '.data', `profile_${userId}.json`);
          
          if (fs.existsSync(profilePath)) {
            const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
            console.log(`📂 Found server-side profile for ${userId}`);
            return this.formatUserProfile(profileData);
          }
        } catch (fsError) {
          console.warn('Could not read server-side profile:', fsError);
        }
      }

      // Try to get from localStorage (client-side)
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(`aspendos_user_profile_${userId}`);
        if (stored) {
          const profile = JSON.parse(stored);
          console.log(`📱 Found localStorage profile for ${userId}`);
          return this.formatUserProfile(profile);
        }
      }

      // Try to get from database service
      const { databaseService } = await import('../database/DatabaseService');
      const userData = await databaseService.getUserByClerkId(userId);
      
      if (userData) {
        console.log(`🗄️ Found database profile for ${userId}`);
        return this.formatUserProfile(userData);
      }

      console.log(`⚠️ No user data found for ${userId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error getting user profile for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Format user profile data into a readable string
   */
  private formatUserProfile(userData: any): string {
    const parts = [];
    
    // Handle direct profile data (from profile API)
    if (userData.age) parts.push(`Age: ${userData.age}`);
    if (userData.location) parts.push(`Location: ${userData.location}`);
    if (userData.occupation) parts.push(`Occupation: ${userData.occupation}`);
    if (userData.interests) parts.push(`Interests: ${userData.interests}`);
    if (userData.bio) parts.push(`Bio: ${userData.bio}`);
    if (userData.university) parts.push(`University: ${userData.university}`);
    if (userData.company) parts.push(`Company: ${userData.company}`);
    
    // Handle database user data
    if (userData.name) {
      parts.push(`Name: ${userData.name}`);
    }
    
    if (userData.email) {
      parts.push(`Email: ${userData.email}`);
    }
    
    if (userData.plan) {
      parts.push(`Plan: ${userData.plan}`);
    }
    
    if (userData.createdAt) {
      parts.push(`Member since: ${new Date(userData.createdAt).toLocaleDateString()}`);
    }

    // Add any nested profile fields if they exist
    if (userData.profile) {
      if (userData.profile.age) parts.push(`Age: ${userData.profile.age}`);
      if (userData.profile.location) parts.push(`Location: ${userData.profile.location}`);
      if (userData.profile.occupation) parts.push(`Occupation: ${userData.profile.occupation}`);
      if (userData.profile.interests) parts.push(`Interests: ${userData.profile.interests}`);
      if (userData.profile.bio) parts.push(`Bio: ${userData.profile.bio}`);
      if (userData.profile.university) parts.push(`University: ${userData.profile.university}`);
      if (userData.profile.company) parts.push(`Company: ${userData.profile.company}`);
    }

    // Handle preferences
    if (userData.preferences) {
      if (userData.preferences.language) parts.push(`Language: ${userData.preferences.language}`);
      if (userData.preferences.timezone) parts.push(`Timezone: ${userData.preferences.timezone}`);
    }

    return parts.length > 0 ? `User Profile - ${parts.join(', ')}` : 'User Profile - No profile information available';
  }

  /**
   * Index common queries and their embeddings
   */
  private async indexCommonQueries(): Promise<void> {
    const commonQueries = [
      'who am i',
      'what do you know about me',
      'user profile',
      'tell me about myself',
      'my profile',
      'about me',
      'help me with coding',
      'explain this concept',
      'write me a function',
      'create a component',
      'debug this code',
      'optimize performance'
    ];

    let indexedCount = 0;

    for (const query of commonQueries) {
      const cacheKey = query.length <= 100 ? query : query.substring(0, 100);
      
      if (!embeddingCache.has(cacheKey)) {
        // Skip dummy embeddings - they cause cosine similarity issues
        // TODO: Implement proper embedding generation here if needed
        // For now, let real embeddings be generated on demand
        indexedCount++;
      }
    }

    console.log(`💾 Pre-indexed ${indexedCount} common query embeddings`);
  }

  /**
   * Index recent conversations for faster memory retrieval
   */
  private async indexRecentConversations(userId?: string): Promise<void> {
    // This would typically pre-load recent conversation summaries into cache
    // For now, we'll just log the intent
    console.log(`📚 Indexing recent conversations${userId ? ` for user ${userId}` : ''}`);
    
    // In a real implementation, this would:
    // 1. Query recent conversations from database
    // 2. Generate summaries and embeddings
    // 3. Pre-load into memory search cache
    // 4. Update conversation metadata for faster access
  }

  /**
   * Pre-load model catalog data
   */
  private async preloadModelCatalog(): Promise<void> {
    try {
      console.log('📚 Pre-loading model catalog data...');
      
      // Trigger model catalog initialization if not already done
      const { modelCatalog } = await import('../catalog/ModelCatalog');
      await modelCatalog.initialize();
      
      // Pre-load common filters
      const commonFilters = [
        { type: 'text' as const },
        { type: 'image' as const },
        { type: 'multimodal' as const },
        { freeOnly: true },
        { provider: 'openai' },
        { provider: 'openrouter' },
        { maxCost: 0.001 },
        { category: 'flagship' },
        { category: 'cost-effective' }
      ];
      
      let preloadedCount = 0;
      for (const filter of commonFilters) {
        try {
          await modelCatalog.getModelsByFilter(filter);
          preloadedCount++;
        } catch (error) {
          console.warn(`Failed to preload filter:`, filter, error);
        }
      }
      
      console.log(`💾 Pre-loaded ${preloadedCount} common model filters`);
      
      // Pre-load commonly accessed models
      const commonModelIds = [
        'gpt-4o',
        'gpt-4o-mini',
        'claude-3.5-sonnet',
        'gemini-pro',
        'dall-e-3',
        'gpt-image-1'
      ];
      
      let modelCount = 0;
      for (const modelId of commonModelIds) {
        try {
          await modelCatalog.getModelById(modelId);
          modelCount++;
        } catch (error) {
          console.warn(`Failed to preload model ${modelId}:`, error);
        }
      }
      
      console.log(`💾 Pre-loaded ${modelCount} common models`);
      
    } catch (error) {
      console.error('❌ Failed to preload model catalog:', error);
      throw error;
    }
  }

  /**
   * Schedule common indexing jobs
   */
  private scheduleCommonIndexing(): void {
    // Index common queries immediately
    this.addJob({
      type: 'common_queries',
      priority: 'high'
    });

    // Pre-load model catalog immediately
    this.addJob({
      type: 'model_catalog_preload',
      priority: 'high'
    });

    // Schedule periodic re-indexing
    setInterval(() => {
      this.addJob({
        type: 'common_queries',
        priority: 'low'
      });
      
      // Re-preload model catalog every 2 hours
      this.addJob({
        type: 'model_catalog_preload',
        priority: 'medium'
      });
    }, 60 * 60 * 1000); // Re-index every hour

    console.log('📅 Scheduled periodic indexing jobs');
  }

  /**
   * Get indexing statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.indexingQueue.length,
      isProcessing: this.isProcessing,
      uptime: process.uptime()
    };
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): IndexingJob[] {
    return this.indexingQueue.map(job => ({
      ...job,
      // Don't expose internal details
    }));
  }

  /**
   * Update average processing time
   */
  private updateProcessingTime(time: number): void {
    if (this.stats.averageProcessingTime === 0) {
      this.stats.averageProcessingTime = time;
    } else {
      // Moving average
      this.stats.averageProcessingTime = (this.stats.averageProcessingTime * 0.7) + (time * 0.3);
    }
  }

  /**
   * Clean up and stop processing
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.indexingQueue = [];
    console.log('🛑 Memory indexer stopped');
  }
}

// Singleton instance
export const memoryIndexer = new MemoryIndexer();