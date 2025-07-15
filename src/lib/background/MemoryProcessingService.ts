/**
 * Background Memory Processing Service
 * Handles async memory extraction, quality scoring, and optimization
 */

import { EnhancedGCPVectorStore, ExtractedMemory } from '../rag/EnhancedGCPVectorStore';
import { getModelRouter } from '../model-router';

interface MemoryProcessingTask {
  id: string;
  userId: string;
  conversationId: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  retries: number;
}

interface MemoryOptimizationTask {
  userId: string;
  action: 'consolidate' | 'cleanup' | 'quality_check';
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export class MemoryProcessingService {
  private static instance: MemoryProcessingService;
  private vectorStore: EnhancedGCPVectorStore;
  private modelRouter = getModelRouter();
  
  // Processing queues
  private extractionQueue: Map<string, MemoryProcessingTask> = new Map();
  private optimizationQueue: Map<string, MemoryOptimizationTask> = new Map();
  private processingInProgress = new Set<string>();
  
  // Background processing intervals
  private extractionInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly extractionIntervalMs = 1000 * 30; // 30 seconds
  private readonly optimizationIntervalMs = 1000 * 60 * 10; // 10 minutes
  private readonly maxRetries = 3;
  private readonly batchSize = 5;
  
  // Performance tracking
  private processingStats = {
    totalTasks: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    successfulOptimizations: 0,
    failedOptimizations: 0,
    avgProcessingTime: 0
  };

  private constructor() {
    this.vectorStore = new EnhancedGCPVectorStore();
    this.initializeProcessingService();
  }

  static getInstance(): MemoryProcessingService {
    if (!MemoryProcessingService.instance) {
      MemoryProcessingService.instance = new MemoryProcessingService();
    }
    return MemoryProcessingService.instance;
  }

  /**
   * Initialize the background processing service
   */
  private initializeProcessingService(): void {
    console.log('⚙️ Initializing Background Memory Processing Service');
    
    // Start background processing
    this.startExtractionProcessor();
    this.startOptimizationProcessor();
  }

  /**
   * Add memory extraction task to the queue
   */
  addExtractionTask(
    userId: string,
    conversationId: string,
    content: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    const taskId = `${userId}-${conversationId}-${Date.now()}`;
    
    const task: MemoryProcessingTask = {
      id: taskId,
      userId,
      conversationId,
      content,
      priority,
      timestamp: new Date(),
      retries: 0
    };

    this.extractionQueue.set(taskId, task);
    console.log(`⚙️ Added memory extraction task for user ${userId.substring(0, 20)} (priority: ${priority})`);

    // Process high-priority tasks immediately
    if (priority === 'high') {
      this.processExtractionTask(task).catch(error => {
        console.warn('High-priority extraction task failed:', error);
      });
    }
  }

  /**
   * Add memory optimization task to the queue
   */
  addOptimizationTask(
    userId: string,
    action: 'consolidate' | 'cleanup' | 'quality_check',
    priority: 'high' | 'medium' | 'low' = 'low'
  ): void {
    const taskId = `${userId}-${action}-${Date.now()}`;
    
    const task: MemoryOptimizationTask = {
      userId,
      action,
      priority,
      timestamp: new Date()
    };

    this.optimizationQueue.set(taskId, task);
    console.log(`⚙️ Added memory optimization task: ${action} for user ${userId.substring(0, 20)}`);
  }

  /**
   * Start the extraction processor
   */
  private startExtractionProcessor(): void {
    this.extractionInterval = setInterval(() => {
      this.processExtractionQueue();
    }, this.extractionIntervalMs);
    
    console.log(`⚙️ Started memory extraction processor (every ${this.extractionIntervalMs / 1000}s)`);
  }

  /**
   * Start the optimization processor
   */
  private startOptimizationProcessor(): void {
    this.optimizationInterval = setInterval(() => {
      this.processOptimizationQueue();
    }, this.optimizationIntervalMs);
    
    console.log(`⚙️ Started memory optimization processor (every ${this.optimizationIntervalMs / 1000 / 60}m)`);
  }

  /**
   * Process the extraction queue
   */
  private async processExtractionQueue(): Promise<void> {
    if (this.extractionQueue.size === 0) {
      return;
    }

    console.log(`⚙️ Processing extraction queue (${this.extractionQueue.size} tasks)`);
    
    // Sort tasks by priority and timestamp
    const sortedTasks = Array.from(this.extractionQueue.values())
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        }
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

    // Process tasks in batches
    const tasksToProcess = sortedTasks.slice(0, this.batchSize);
    
    const processingPromises = tasksToProcess.map(task => 
      this.processExtractionTask(task)
        .then(() => this.extractionQueue.delete(task.id))
        .catch(error => this.handleExtractionError(task, error))
    );

    await Promise.allSettled(processingPromises);
  }

  /**
   * Process a single extraction task
   */
  private async processExtractionTask(task: MemoryProcessingTask): Promise<void> {
    if (this.processingInProgress.has(task.id)) {
      return;
    }

    const startTime = Date.now();
    this.processingInProgress.add(task.id);
    this.processingStats.totalTasks++;

    try {
      console.log(`⚙️ Processing extraction task ${task.id}`);
      
      // Extract memories using AI
      const extractedMemories = await this.extractMemoriesFromContent(
        task.content,
        task.conversationId
      );

      if (extractedMemories.length > 0) {
        // Store memories with quality scoring
        const scoredMemories = await this.scoreMemoryQuality(extractedMemories);
        const highQualityMemories = scoredMemories.filter(m => m.confidence >= 0.6);
        
        if (highQualityMemories.length > 0) {
          await this.vectorStore.storeMemories(task.userId, highQualityMemories);
          console.log(`✅ Stored ${highQualityMemories.length} high-quality memories for user ${task.userId.substring(0, 20)}`);
        }
      }

      const duration = Date.now() - startTime;
      this.updateProcessingStats(duration, 'extraction', true);
      this.processingStats.successfulExtractions++;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateProcessingStats(duration, 'extraction', false);
      this.processingStats.failedExtractions++;
      throw error;
    } finally {
      this.processingInProgress.delete(task.id);
    }
  }

  /**
   * Handle extraction task errors
   */
  private handleExtractionError(task: MemoryProcessingTask, error: any): void {
    console.error(`❌ Extraction task ${task.id} failed:`, error);
    
    task.retries++;
    if (task.retries < this.maxRetries) {
      // Reduce priority and retry
      task.priority = task.priority === 'high' ? 'medium' : 'low';
      console.log(`⚙️ Retrying extraction task ${task.id} (attempt ${task.retries + 1})`);
    } else {
      console.error(`❌ Extraction task ${task.id} failed after ${this.maxRetries} retries`);
      this.extractionQueue.delete(task.id);
    }
  }

  /**
   * Process the optimization queue
   */
  private async processOptimizationQueue(): Promise<void> {
    if (this.optimizationQueue.size === 0) {
      return;
    }

    console.log(`⚙️ Processing optimization queue (${this.optimizationQueue.size} tasks)`);
    
    // Sort by priority
    const sortedTasks = Array.from(this.optimizationQueue.values())
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });

    // Process one optimization task at a time to avoid overwhelming the system
    const task = sortedTasks[0];
    if (task) {
      try {
        await this.processOptimizationTask(task);
        this.processingStats.successfulOptimizations++;
      } catch (error) {
        console.error(`❌ Optimization task failed:`, error);
        this.processingStats.failedOptimizations++;
      }
      
      // Remove the task regardless of success/failure
      const taskKey = Array.from(this.optimizationQueue.entries())
        .find(([, t]) => t === task)?.[0];
      if (taskKey) {
        this.optimizationQueue.delete(taskKey);
      }
    }
  }

  /**
   * Process a single optimization task
   */
  private async processOptimizationTask(task: MemoryOptimizationTask): Promise<void> {
    console.log(`⚙️ Processing optimization task: ${task.action} for user ${task.userId.substring(0, 20)}`);
    
    switch (task.action) {
      case 'consolidate':
        await this.consolidateUserMemories(task.userId);
        break;
      case 'cleanup':
        await this.cleanupLowQualityMemories(task.userId);
        break;
      case 'quality_check':
        await this.performQualityCheck(task.userId);
        break;
    }
  }

  /**
   * Extract memories from content using AI
   */
  private async extractMemoriesFromContent(
    content: string,
    conversationId: string
  ): Promise<ExtractedMemory[]> {
    if (content.length < 20) {
      return [];
    }

    try {
      const prompt = `Analyze this user message and extract important personal information, preferences, facts, skills, or goals. Be selective and only extract clear, useful information.

Categories:
- preference: Things the user likes/dislikes, prefers
- skill: User's abilities, expertise, knowledge
- fact: Personal facts about the user (name, location, job, education, etc.)
- goal: User's objectives, plans, intentions
- context: Important contextual information about projects or situations

Message: "${content}"

Return JSON array format: [{"type": "fact", "content": "User lives in New York", "confidence": 0.9}]
Only extract clear, useful information. Return empty array [] if nothing relevant found.`;

      const response = await this.modelRouter.generateText({
        model: 'gpt-4o-mini', // Use cost-effective model
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 500
      });

      const extractedText = response.content;
      const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(item => 
          item.type && 
          item.content && 
          ['preference', 'skill', 'fact', 'goal', 'context'].includes(item.type) &&
          item.confidence >= 0.5
        )
        .map(item => ({
          type: item.type as ExtractedMemory['type'],
          content: item.content.trim(),
          confidence: Math.min(Math.max(item.confidence || 0.7, 0), 1),
          extractedFrom: conversationId,
          timestamp: new Date(),
        }));
    } catch (error) {
      console.error('AI memory extraction failed:', error);
      return [];
    }
  }

  /**
   * Score memory quality
   */
  private async scoreMemoryQuality(memories: ExtractedMemory[]): Promise<ExtractedMemory[]> {
    return memories.map(memory => {
      let qualityScore = memory.confidence;
      
      // Boost score for specific information
      if (memory.content.includes('name is') || memory.content.includes('lives in')) {
        qualityScore += 0.1;
      }
      
      // Reduce score for vague information
      if (memory.content.includes('might') || memory.content.includes('maybe')) {
        qualityScore -= 0.2;
      }
      
      // Ensure score is within bounds
      qualityScore = Math.min(Math.max(qualityScore, 0), 1);
      
      return {
        ...memory,
        confidence: qualityScore
      };
    });
  }

  /**
   * Consolidate duplicate user memories
   */
  private async consolidateUserMemories(userId: string): Promise<void> {
    try {
      console.log(`🔄 Consolidating memories for user ${userId.substring(0, 20)}`);
      
      // Get all user memories
      const allMemories = await this.vectorStore.searchUserMemories(userId, '', undefined, 100);
      
      // Group similar memories
      const groups = this.groupSimilarMemories(allMemories);
      
      // Consolidate each group
      for (const group of groups) {
        if (group.length > 1) {
          const consolidatedMemory = this.consolidateMemoryGroup(group);
          // In a full implementation, you would update the vector store
          console.log(`📝 Consolidated ${group.length} memories into: ${consolidatedMemory.content.substring(0, 50)}...`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to consolidate memories for user ${userId}:`, error);
    }
  }

  /**
   * Clean up low-quality memories
   */
  private async cleanupLowQualityMemories(userId: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning up low-quality memories for user ${userId.substring(0, 20)}`);
      
      const allMemories = await this.vectorStore.searchUserMemories(userId, '', undefined, 100);
      const lowQualityMemories = allMemories.filter(m => m.confidence < 0.4);
      
      console.log(`🧹 Found ${lowQualityMemories.length} low-quality memories to clean up`);
      
      // In a full implementation, you would delete these from the vector store
      
    } catch (error) {
      console.error(`❌ Failed to cleanup memories for user ${userId}:`, error);
    }
  }

  /**
   * Perform quality check on user memories
   */
  private async performQualityCheck(userId: string): Promise<void> {
    try {
      console.log(`🔍 Performing quality check for user ${userId.substring(0, 20)}`);
      
      const stats = await this.vectorStore.getUserMemoryStats(userId);
      console.log(`📊 Memory quality check completed for user ${userId.substring(0, 20)}:`, stats);
      
    } catch (error) {
      console.error(`❌ Failed to perform quality check for user ${userId}:`, error);
    }
  }

  /**
   * Group similar memories
   */
  private groupSimilarMemories(memories: ExtractedMemory[]): ExtractedMemory[][] {
    const groups: ExtractedMemory[][] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < memories.length; i++) {
      if (processed.has(i)) continue;
      
      const group = [memories[i]];
      processed.add(i);
      
      for (let j = i + 1; j < memories.length; j++) {
        if (processed.has(j)) continue;
        
        if (this.areMemoriesSimilar(memories[i], memories[j])) {
          group.push(memories[j]);
          processed.add(j);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }

  /**
   * Check if two memories are similar
   */
  private areMemoriesSimilar(memory1: ExtractedMemory, memory2: ExtractedMemory): boolean {
    if (memory1.type !== memory2.type) return false;
    
    const content1 = memory1.content.toLowerCase();
    const content2 = memory2.content.toLowerCase();
    
    // Simple similarity check based on common words
    const words1 = content1.split(' ');
    const words2 = content2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word) && word.length > 3);
    
    return commonWords.length >= Math.min(words1.length, words2.length) * 0.5;
  }

  /**
   * Consolidate a group of similar memories
   */
  private consolidateMemoryGroup(group: ExtractedMemory[]): ExtractedMemory {
    // Use the most recent memory as base
    const base = group.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
    // Combine content from all memories
    const combinedContent = group
      .map(m => m.content)
      .filter((content, index, arr) => arr.indexOf(content) === index) // Remove duplicates
      .join('; ');
    
    return {
      ...base,
      content: combinedContent,
      confidence: Math.max(...group.map(m => m.confidence))
    };
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(duration: number, type: 'extraction' | 'optimization', success: boolean): void {
    this.processingStats.avgProcessingTime = (
      (this.processingStats.avgProcessingTime * (this.processingStats.totalTasks - 1)) + duration
    ) / this.processingStats.totalTasks;
  }

  /**
   * Get processing service statistics
   */
  getProcessingStats(): {
    totalTasks: number;
    successfulExtractions: number;
    failedExtractions: number;
    successfulOptimizations: number;
    failedOptimizations: number;
    avgProcessingTime: number;
    extractionQueueSize: number;
    optimizationQueueSize: number;
    processingInProgress: number;
    extractionSuccessRate: number;
    optimizationSuccessRate: number;
  } {
    const totalExtractions = this.processingStats.successfulExtractions + this.processingStats.failedExtractions;
    const totalOptimizations = this.processingStats.successfulOptimizations + this.processingStats.failedOptimizations;
    
    return {
      ...this.processingStats,
      extractionQueueSize: this.extractionQueue.size,
      optimizationQueueSize: this.optimizationQueue.size,
      processingInProgress: this.processingInProgress.size,
      extractionSuccessRate: totalExtractions > 0 ? (this.processingStats.successfulExtractions / totalExtractions) * 100 : 0,
      optimizationSuccessRate: totalOptimizations > 0 ? (this.processingStats.successfulOptimizations / totalOptimizations) * 100 : 0
    };
  }

  /**
   * Stop the processing service
   */
  stop(): void {
    if (this.extractionInterval) {
      clearInterval(this.extractionInterval);
      this.extractionInterval = null;
    }
    
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    
    console.log('⚙️ Memory processing service stopped');
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): {
    extraction: { id: string; userId: string; priority: string; retries: number }[];
    optimization: { userId: string; action: string; priority: string }[];
  } {
    return {
      extraction: Array.from(this.extractionQueue.values()).map(task => ({
        id: task.id.substring(0, 20) + '...',
        userId: task.userId.substring(0, 20) + '...',
        priority: task.priority,
        retries: task.retries
      })),
      optimization: Array.from(this.optimizationQueue.values()).map(task => ({
        userId: task.userId.substring(0, 20) + '...',
        action: task.action,
        priority: task.priority
      }))
    };
  }
}

// Singleton instance
export const memoryProcessingService = MemoryProcessingService.getInstance();