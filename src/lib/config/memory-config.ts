/**
 * Memory Management Configuration
 * Controls how conversations and user context are stored and retrieved
 */

export interface MemoryConfig {
  // Conversation retention limits
  maxConversationsToRetain: number;      // Total conversations to keep in memory
  maxConversationsPerQuery: number;      // Max conversations to search per query
  
  // Context persistence settings
  crossChatContextEnabled: boolean;      // Enable context across different chat sessions
  contextRetentionDays: number;          // How long to keep context data
  
  // Search optimization
  maxUserMemoriesPerQuery: number;       // Max user memories to retrieve per query
  maxConversationMemoriesPerQuery: number; // Max conversation memories per query
  
  // Performance settings
  memorySearchTimeoutMs: number;         // Timeout for memory searches
  vectorSearchBatchSize: number;         // Batch size for vector searches
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  // Conversation limits - can be adjusted based on user plan
  maxConversationsToRetain: 1000,        // Keep last 1000 conversations
  maxConversationsPerQuery: 20,          // Search through 20 most recent
  
  // Cross-chat context
  crossChatContextEnabled: true,         // Enable by default
  contextRetentionDays: 30,              // Keep context for 30 days
  
  // Search limits
  maxUserMemoriesPerQuery: 5,            // User profile/facts
  maxConversationMemoriesPerQuery: 8,    // Conversation snippets
  
  // Performance
  memorySearchTimeoutMs: 3000,           // 3 second timeout
  vectorSearchBatchSize: 50,             // Process 50 at a time
};

export const PLAN_MEMORY_CONFIGS: Record<string, Partial<MemoryConfig>> = {
  'FREE': {
    maxConversationsToRetain: 100,       // Limited for free users
    maxConversationsPerQuery: 10,
    maxUserMemoriesPerQuery: 3,
    maxConversationMemoriesPerQuery: 5,
    contextRetentionDays: 7,              // 1 week retention
  },
  'PRO': {
    maxConversationsToRetain: 500,       // More for pro users
    maxConversationsPerQuery: 15,
    maxUserMemoriesPerQuery: 5,
    maxConversationMemoriesPerQuery: 8,
    contextRetentionDays: 30,             // 1 month retention
  },
  'ENTERPRISE': {
    maxConversationsToRetain: 2000,      // Even more for enterprise
    maxConversationsPerQuery: 25,
    maxUserMemoriesPerQuery: 8,
    maxConversationMemoriesPerQuery: 12,
    contextRetentionDays: 90,             // 3 months retention
  }
};

/**
 * Get memory configuration for a user based on their plan
 */
export function getMemoryConfigForPlan(plan: string = 'FREE'): MemoryConfig {
  const planConfig = PLAN_MEMORY_CONFIGS[plan.toUpperCase()] || PLAN_MEMORY_CONFIGS['FREE'];
  return { ...DEFAULT_MEMORY_CONFIG, ...planConfig };
}

/**
 * Environment-based memory configuration
 */
export function getMemoryConfigFromEnv(): Partial<MemoryConfig> {
  return {
    maxConversationsToRetain: parseInt(process.env.MAX_CONVERSATIONS_RETAIN || '1000'),
    maxConversationsPerQuery: parseInt(process.env.MAX_CONVERSATIONS_PER_QUERY || '20'),
    memorySearchTimeoutMs: parseInt(process.env.MEMORY_SEARCH_TIMEOUT_MS || '3000'),
    crossChatContextEnabled: process.env.CROSS_CHAT_CONTEXT_ENABLED !== 'false',
  };
}