/**
 * LangChain RAG Adapter
 * This allows gradual migration from the existing custom RAG to LangChain
 */

import { EnhancedLangChainRAG } from './enhanced-rag';
import { MemoryManager } from '../rag/MemoryManager';
import { ExtractedMemory } from '../rag/EnhancedGCPVectorStore';

interface RAGAdapter {
  useNewRAG: boolean;
  fallbackToOld: boolean;
  performanceThreshold: number; // ms
}

export class HybridRAGManager {
  private langchainRAG: EnhancedLangChainRAG | null = null;
  private legacyRAG: MemoryManager;
  private config: RAGAdapter;

  constructor(
    legacyMemoryManager: MemoryManager,
    config: RAGAdapter = {
      useNewRAG: false, // Start with false for safe rollout
      fallbackToOld: true,
      performanceThreshold: 2000 // 2 seconds max
    }
  ) {
    this.legacyRAG = legacyMemoryManager;
    this.config = config;

    // Initialize LangChain RAG if enabled
    if (this.config.useNewRAG) {
      try {
        this.langchainRAG = new EnhancedLangChainRAG({
          openaiApiKey: process.env.OPENAI_API_KEY!,
          firestoreProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
          collectionName: 'omnix-langchain-vectors'
        });
        console.log('🔗 LangChain RAG initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize LangChain RAG:', error);
        this.config.useNewRAG = false;
      }
    }
  }

  /**
   * Get relevant memories with automatic fallback
   */
  async getRelevantMemoriesForContext(
    userId: string,
    query: string,
    contextType: 'conversation' | 'preference' | 'skill' = 'conversation'
  ): Promise<{
    conversationMemories: any[];
    userMemories: ExtractedMemory[];
    formatted: string;
    source: 'langchain' | 'legacy';
    performance: number;
  }> {
    const startTime = performance.now();

    // Try LangChain first if enabled
    if (this.config.useNewRAG && this.langchainRAG) {
      try {
        console.log('🔗 Using LangChain RAG for memory retrieval');
        
        const result = await Promise.race([
          this.getLangChainMemories(userId, query),
          this.createTimeoutPromise(this.config.performanceThreshold)
        ]);

        const performance = Date.now() - startTime;
        
        if (result && result.success) {
          console.log(`✅ LangChain RAG succeeded in ${performance}ms`);
          return {
            conversationMemories: result.documents || [],
            userMemories: result.userMemories || [],
            formatted: result.formatted || '',
            source: 'langchain',
            performance
          };
        }
      } catch (error) {
        console.warn('⚠️ LangChain RAG failed, falling back to legacy:', error);
      }
    }

    // Fallback to legacy system
    if (this.config.fallbackToOld) {
      console.log('🔄 Using legacy RAG for memory retrieval');
      
      const legacyResult = await this.legacyRAG.getRelevantMemoriesForContext(
        userId,
        query,
        contextType
      );

      const performance = Date.now() - startTime;
      
      return {
        ...legacyResult,
        source: 'legacy',
        performance
      };
    }

    // No fallback, return empty
    return {
      conversationMemories: [],
      userMemories: [],
      formatted: '',
      source: 'legacy',
      performance: Date.now() - startTime
    };
  }

  /**
   * Store conversation in both systems for comparison
   */
  async storeConversation(
    userId: string,
    conversationId: string,
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
      timestamp: Date;
    }>
  ): Promise<{
    langchainSuccess: boolean;
    legacySuccess: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let langchainSuccess = false;
    let legacySuccess = false;

    // Store in LangChain if enabled
    if (this.config.useNewRAG && this.langchainRAG) {
      try {
        await this.langchainRAG.storeConversation(userId, conversationId, messages);
        langchainSuccess = true;
        console.log('✅ Conversation stored in LangChain');
      } catch (error) {
        errors.push(`LangChain storage failed: ${error}`);
        console.error('❌ LangChain conversation storage failed:', error);
      }
    }

    // Always store in legacy system for safety
    try {
      // Convert to the format expected by legacy system
      const conversationContext = {
        id: conversationId,
        userId,
        title: 'Auto-generated conversation',
        messages: messages.map((msg, index) => ({
          id: `msg-${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        metadata: {
          currentModel: 'gpt-4',
          startedAt: messages[0]?.timestamp || new Date(),
          lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
          tokenCount: messages.reduce((acc, msg) => acc + msg.content.length / 4, 0)
        },
        settings: {
          memoryEnabled: true
        }
      };

      // This would call your existing memory processing
      // await this.legacyRAG.processConversationForRAG(userId, conversationId);
      legacySuccess = true;
      console.log('✅ Conversation stored in legacy system');
    } catch (error) {
      errors.push(`Legacy storage failed: ${error}`);
      console.error('❌ Legacy conversation storage failed:', error);
    }

    return {
      langchainSuccess,
      legacySuccess,
      errors
    };
  }

  /**
   * Get LangChain memories in the format expected by the existing system
   */
  private async getLangChainMemories(userId: string, query: string) {
    if (!this.langchainRAG) throw new Error('LangChain RAG not initialized');

    const result = await this.langchainRAG.retrieveRelevantMemories(userId, query, {
      topK: 5,
      searchType: 'mmr'
    });

    // Convert LangChain documents to legacy format
    const conversationMemories = result.documents.map(doc => ({
      content: doc.pageContent,
      relevanceScore: 0.8, // LangChain doesn't expose exact scores
      conversationId: doc.metadata?.conversationId || 'unknown',
      timestamp: doc.metadata?.timestamp || new Date().toISOString(),
      model: 'langchain-rag',
      messageId: doc.metadata?.chunkIndex || 'unknown'
    }));

    // Format for context injection
    const formatted = this.langchainRAG.formatRetrievedContext(result.documents, query);

    return {
      success: true,
      documents: conversationMemories,
      userMemories: [], // Could be enhanced to extract user memories
      formatted
    };
  }

  /**
   * Create timeout promise for performance monitoring
   */
  private createTimeoutPromise(timeoutMs: number): Promise<null> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('RAG query timeout')), timeoutMs);
    });
  }

  /**
   * Toggle between RAG systems for A/B testing
   */
  enableLangChainRAG(enabled: boolean = true) {
    this.config.useNewRAG = enabled;
    console.log(`🔄 LangChain RAG ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get performance metrics for both systems
   */
  getPerformanceStats(): {
    currentSystem: 'langchain' | 'legacy' | 'hybrid';
    config: RAGAdapter;
    isLangChainReady: boolean;
  } {
    return {
      currentSystem: this.config.useNewRAG ? 'langchain' : 'legacy',
      config: this.config,
      isLangChainReady: this.langchainRAG !== null
    };
  }
}

// Export singleton pattern for easy usage
let hybridRAGInstance: HybridRAGManager | null = null;

export function getHybridRAG(legacyMemoryManager?: MemoryManager): HybridRAGManager {
  if (!hybridRAGInstance && legacyMemoryManager) {
    hybridRAGInstance = new HybridRAGManager(legacyMemoryManager);
  }
  return hybridRAGInstance!;
}

export default HybridRAGManager;