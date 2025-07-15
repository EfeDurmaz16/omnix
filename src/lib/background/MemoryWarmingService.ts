/**
 * Memory Warming Service
 * Preemptively loads and caches user memory data for instant access
 */

import { contextManager } from '../context/AdvancedContextManager';
import { EnhancedGCPVectorStore } from '../rag/EnhancedGCPVectorStore';

interface UserActivity {
  userId: string;
  lastActivity: Date;
  activityScore: number;
  commonQueries: string[];
  priorityLevel: 'high' | 'medium' | 'low';
}

export class MemoryWarmingService {
  private static instance: MemoryWarmingService;
  private vectorStore: EnhancedGCPVectorStore;
  private warmingQueue: Map<string, UserActivity> = new Map();
  private warmingInProgress = new Set<string>();
  private warmingInterval: NodeJS.Timeout | null = null;
  private readonly warmingIntervalMs = 1000 * 60 * 5; // 5 minutes
  
  // Performance tracking
  private warmingStats = {
    totalWarmed: 0,
    successfulWarming: 0,
    failedWarming: 0,
    avgWarmingTime: 0
  };

  private constructor() {
    this.vectorStore = new EnhancedGCPVectorStore();
    this.initializeWarmingService();
  }

  static getInstance(): MemoryWarmingService {
    if (!MemoryWarmingService.instance) {
      MemoryWarmingService.instance = new MemoryWarmingService();
    }
    return MemoryWarmingService.instance;
  }

  /**
   * Initialize the memory warming service
   */
  private initializeWarmingService(): void {
    console.log('🔥 Initializing Memory Warming Service');
    
    // Start periodic warming
    this.startPeriodicWarming();
    
    // Warm known active users immediately
    this.warmKnownActiveUsers();
  }

  /**
   * Add user to warming queue based on activity
   */
  addUserToWarmingQueue(
    userId: string, 
    lastActivity: Date = new Date(),
    commonQueries: string[] = []
  ): void {
    const activityScore = this.calculateActivityScore(lastActivity);
    const priorityLevel = this.calculatePriorityLevel(activityScore);
    
    this.warmingQueue.set(userId, {
      userId,
      lastActivity,
      activityScore,
      commonQueries: commonQueries.length > 0 ? commonQueries : this.getDefaultQueries(),
      priorityLevel
    });

    console.log(`🔥 Added user ${userId.substring(0, 20)} to warming queue (priority: ${priorityLevel})`);
    
    // Immediately warm high-priority users
    if (priorityLevel === 'high') {
      this.warmUserMemory(userId);
    }
  }

  /**
   * Warm user memory immediately
   */
  async warmUserMemory(userId: string): Promise<void> {
    if (this.warmingInProgress.has(userId)) {
      console.log(`⚠️ Warming already in progress for user ${userId.substring(0, 20)}`);
      return;
    }

    const startTime = Date.now();
    this.warmingInProgress.add(userId);
    this.warmingStats.totalWarmed++;

    try {
      console.log(`🔥 Starting memory warming for user ${userId.substring(0, 20)}`);
      
      const userActivity = this.warmingQueue.get(userId);
      const queries = userActivity?.commonQueries || this.getDefaultQueries();
      
      // Parallel warming of different memory types
      await Promise.all([
        this.warmProfileMemories(userId),
        this.warmQueryMemories(userId, queries),
        this.warmRecentConversations(userId)
      ]);
      
      const duration = Date.now() - startTime;
      this.updateWarmingStats(duration, true);
      
      console.log(`✅ Memory warming completed for user ${userId.substring(0, 20)} in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateWarmingStats(duration, false);
      console.error(`❌ Memory warming failed for user ${userId.substring(0, 20)}:`, error);
    } finally {
      this.warmingInProgress.delete(userId);
    }
  }

  /**
   * Warm user profile memories
   */
  private async warmProfileMemories(userId: string): Promise<void> {
    try {
      // Pre-load user profile
      const profileQueries = [
        'who am i',
        'what do you know about me', 
        'my profile',
        'about me',
        'user profile and preferences'
      ];

      for (const query of profileQueries) {
        await this.vectorStore.searchUserMemories(userId, query, 'fact', 5);
        await this.vectorStore.searchRelevantMemories(userId, query, 3);
      }
      
      console.log(`🔥 Profile memories warmed for user ${userId.substring(0, 20)}`);
    } catch (error) {
      console.warn(`⚠️ Failed to warm profile memories for user ${userId}:`, error);
    }
  }

  /**
   * Warm memories for common queries
   */
  private async warmQueryMemories(userId: string, queries: string[]): Promise<void> {
    try {
      const warmingPromises = queries.slice(0, 5).map(async (query) => {
        try {
          await Promise.all([
            this.vectorStore.searchUserMemories(userId, query, undefined, 5),
            this.vectorStore.searchRelevantMemories(userId, query, 3)
          ]);
        } catch (error) {
          console.warn(`⚠️ Failed to warm query "${query}" for user ${userId}:`, error);
        }
      });

      await Promise.all(warmingPromises);
      console.log(`🔥 Query memories warmed for user ${userId.substring(0, 20)} (${queries.length} queries)`);
    } catch (error) {
      console.warn(`⚠️ Failed to warm query memories for user ${userId}:`, error);
    }
  }

  /**
   * Warm recent conversation memories
   */
  private async warmRecentConversations(userId: string): Promise<void> {
    try {
      // Import contextManager dynamically to avoid circular dependency
      const { contextManager } = await import('../context/AdvancedContextManager');
      
      // Get user's recent contexts
      const contexts = await contextManager.getUserContexts(userId);
      const recentContexts = contexts
        .sort((a, b) => b.metadata.lastActivity.getTime() - a.metadata.lastActivity.getTime())
        .slice(0, 3);

      for (const context of recentContexts) {
        const lastMessage = context.messages
          .filter(m => m.role === 'user')
          .slice(-1)[0];
        
        if (lastMessage) {
          await this.vectorStore.searchRelevantMemories(userId, lastMessage.content, 3);
        }
      }
      
      console.log(`🔥 Recent conversation memories warmed for user ${userId.substring(0, 20)}`);
    } catch (error) {
      console.warn(`⚠️ Failed to warm recent conversations for user ${userId}:`, error);
    }
  }

  /**
   * Start periodic memory warming for queued users
   */
  private startPeriodicWarming(): void {
    this.warmingInterval = setInterval(() => {
      this.processWarmingQueue();
    }, this.warmingIntervalMs);
    
    console.log(`🔥 Started periodic memory warming (every ${this.warmingIntervalMs / 1000}s)`);
  }

  /**
   * Process the warming queue
   */
  private async processWarmingQueue(): Promise<void> {
    if (this.warmingQueue.size === 0) {
      return;
    }

    console.log(`🔥 Processing warming queue (${this.warmingQueue.size} users)`);
    
    // Sort by priority and activity score
    const sortedUsers = Array.from(this.warmingQueue.values())
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priorityLevel] * b.activityScore) - 
               (priorityWeight[a.priorityLevel] * a.activityScore);
      });

    // Warm top 3 users to avoid overwhelming the system
    const usersToWarm = sortedUsers.slice(0, 3);
    
    for (const user of usersToWarm) {
      if (!this.warmingInProgress.has(user.userId)) {
        // Don't block - warm in background
        this.warmUserMemory(user.userId).catch(error => {
          console.warn(`Background warming failed for user ${user.userId}:`, error);
        });
        
        // Remove from queue after warming
        this.warmingQueue.delete(user.userId);
      }
    }
  }

  /**
   * Calculate activity score based on last activity
   */
  private calculateActivityScore(lastActivity: Date): number {
    const now = new Date();
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceActivity < 1) return 1.0;       // Very recent
    if (hoursSinceActivity < 6) return 0.8;       // Recent
    if (hoursSinceActivity < 24) return 0.6;      // Today
    if (hoursSinceActivity < 72) return 0.4;      // This week
    return 0.2; // Older
  }

  /**
   * Calculate priority level based on activity score
   */
  private calculatePriorityLevel(activityScore: number): 'high' | 'medium' | 'low' {
    if (activityScore >= 0.8) return 'high';
    if (activityScore >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Get default warming queries
   */
  private getDefaultQueries(): string[] {
    return [
      'who am i',
      'what do you know about me',
      'my profile',
      'help me with',
      'what can you do',
      'user profile and preferences',
      'personal information'
    ];
  }

  /**
   * Warm known active users immediately
   */
  private warmKnownActiveUsers(): void {
    // Known active users (could be loaded from database)
    const knownUsers = [
      'user_2ybWF4Ns1Bzgr1jYDYkFkdDWWQU' // Known active user
    ];

    for (const userId of knownUsers) {
      this.addUserToWarmingQueue(userId, new Date(), [
        'who am i',
        'what do you know about me',
        'my profile',
        'personal information'
      ]);
    }
  }

  /**
   * Update warming statistics
   */
  private updateWarmingStats(duration: number, success: boolean): void {
    if (success) {
      this.warmingStats.successfulWarming++;
    } else {
      this.warmingStats.failedWarming++;
    }
    
    // Update average warming time
    const totalWarming = this.warmingStats.successfulWarming + this.warmingStats.failedWarming;
    this.warmingStats.avgWarmingTime = (
      (this.warmingStats.avgWarmingTime * (totalWarming - 1)) + duration
    ) / totalWarming;
  }

  /**
   * Get warming service statistics
   */
  getWarmingStats(): {
    totalWarmed: number;
    successfulWarming: number;
    failedWarming: number;
    avgWarmingTime: number;
    queueSize: number;
    inProgress: number;
    successRate: number;
  } {
    const total = this.warmingStats.successfulWarming + this.warmingStats.failedWarming;
    return {
      ...this.warmingStats,
      queueSize: this.warmingQueue.size,
      inProgress: this.warmingInProgress.size,
      successRate: total > 0 ? (this.warmingStats.successfulWarming / total) * 100 : 0
    };
  }

  /**
   * Stop the warming service
   */
  stop(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
    console.log('🔥 Memory warming service stopped');
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): { userId: string; priority: string; activityScore: number }[] {
    return Array.from(this.warmingQueue.values()).map(user => ({
      userId: user.userId.substring(0, 20) + '...',
      priority: user.priorityLevel,
      activityScore: user.activityScore
    }));
  }
}

// Singleton instance
export const memoryWarmingService = MemoryWarmingService.getInstance();