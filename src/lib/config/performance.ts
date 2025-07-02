/**
 * Performance optimization configuration
 * Adjust these settings based on your performance requirements
 */

export interface PerformanceConfig {
  // Memory settings
  enableMemorySearch: boolean;
  maxMemorySearchTime: number; // Maximum time to spend on memory search (ms)
  memoryCacheTimeout: number; // How long to cache memory results (ms)
  
  // Database settings
  maxConversationsPerQuery: number;
  maxMessagesPerConversation: number;
  
  // Vector search settings
  maxVectorDocuments: number;
  vectorSimilarityThreshold: number;
  embeddingCacheSize: number;
  
  // Feature flags
  enableRAG: boolean;
  enableCrossConversationMemory: boolean;
  enableEmbeddingCache: boolean;

  ragEnabled: boolean;
  memoryInjection: boolean;
  persistenceAsync: boolean;
  vectorSearchTimeout: number;
  contextTimeout: number;
  streamingChunkSize: number;
  streamingDelay: number;
}

export const defaultPerformanceConfig: PerformanceConfig = {
  // Memory settings - optimized for speed
  enableMemorySearch: true,
  maxMemorySearchTime: 1000, // 1 second max for memory search
  memoryCacheTimeout: 5 * 60 * 1000, // 5 minutes cache

  // Database settings - reduced for performance
  maxConversationsPerQuery: 10,
  maxMessagesPerConversation: 5,

  // Vector search settings - optimized thresholds
  maxVectorDocuments: 6,
  vectorSimilarityThreshold: 0.2,
  embeddingCacheSize: 1000,

  // Feature flags - all enabled but optimized
  enableRAG: true,
  enableCrossConversationMemory: true,
  enableEmbeddingCache: true,

  ragEnabled: true,
  memoryInjection: true,
  persistenceAsync: true,
  vectorSearchTimeout: 3000,
  contextTimeout: 5000,
  streamingChunkSize: 20,
  streamingDelay: 10,
};

// Fast performance config for high-load scenarios
export const fastPerformanceConfig: PerformanceConfig = {
  enableMemorySearch: true,
  maxMemorySearchTime: 500, // Even faster
  memoryCacheTimeout: 10 * 60 * 1000, // Longer cache

  maxConversationsPerQuery: 5,
  maxMessagesPerConversation: 3,

  maxVectorDocuments: 4,
  vectorSimilarityThreshold: 0.25, // Higher threshold = fewer results = faster
  embeddingCacheSize: 1500,

  enableRAG: true,
  enableCrossConversationMemory: true,
  enableEmbeddingCache: true,

  ragEnabled: true,
  memoryInjection: true,
  persistenceAsync: true,
  vectorSearchTimeout: 3000,
  contextTimeout: 5000,
  streamingChunkSize: 20,
  streamingDelay: 10,
};

// Minimal config for maximum speed (disables expensive features)
export const minimalPerformanceConfig: PerformanceConfig = {
  enableMemorySearch: false, // Disable memory search entirely
  maxMemorySearchTime: 0,
  memoryCacheTimeout: 0,

  maxConversationsPerQuery: 3,
  maxMessagesPerConversation: 2,

  maxVectorDocuments: 2,
  vectorSimilarityThreshold: 0.3,
  embeddingCacheSize: 500,

  enableRAG: false, // Disable RAG for maximum speed
  enableCrossConversationMemory: false,
  enableEmbeddingCache: true, // Keep embedding cache for efficiency

  ragEnabled: false,
  memoryInjection: false,
  persistenceAsync: true,
  vectorSearchTimeout: 1000,
  contextTimeout: 2000,
  streamingChunkSize: 50,
  streamingDelay: 5,
};

export const PERFORMANCE_CONFIGS: Record<string, PerformanceConfig> = {
  flash: {
    ...minimalPerformanceConfig,
    ragEnabled: false,
    memoryInjection: false,
    persistenceAsync: true,
    vectorSearchTimeout: 1000,
    contextTimeout: 2000,
    streamingChunkSize: 50, // larger chunks for faster streaming
    streamingDelay: 5, // very fast streaming
  },
  think: {
    ...defaultPerformanceConfig,
    ragEnabled: true,
    memoryInjection: true,
    persistenceAsync: true,
    vectorSearchTimeout: 3000,
    contextTimeout: 5000,
    streamingChunkSize: 20,
    streamingDelay: 10,
  },
  'ultra-think': {
    ...defaultPerformanceConfig,
    ragEnabled: true,
    memoryInjection: true,
    persistenceAsync: false,
    vectorSearchTimeout: 5000,
    contextTimeout: 8000,
    streamingChunkSize: 15,
    streamingDelay: 15,
  },
  'full-think': {
    ...defaultPerformanceConfig,
    ragEnabled: true,
    memoryInjection: true,
    persistenceAsync: false,
    vectorSearchTimeout: 10000,
    contextTimeout: 10000,
    streamingChunkSize: 10,
    streamingDelay: 20,
  }
};

// Get performance config based on environment
export function getPerformanceConfig(mode: string = 'think'): PerformanceConfig {
  return PERFORMANCE_CONFIGS[mode] || PERFORMANCE_CONFIGS.think;
}

export function shouldUseQuickMode(mode: string): boolean {
  const config = getPerformanceConfig(mode);
  return !config.ragEnabled;
}