import { 
  EnhancedGCPVectorStore, 
  MemoryResult,
  ExtractedMemory
} from '../rag/EnhancedGCPVectorStore';
import { MemoryManager } from '../rag/MemoryManager';
import { getModelRouter } from '../model-router';
import { conversationStore } from '../database/ConversationStore';

export interface ConversationContext {
  id: string;
  userId: string;
  title: string;
  messages: ContextMessage[];
  metadata: {
    currentModel: string;
    startedAt: Date;
    lastActivity: Date;
    tokenCount: number;
    summary?: string;
  };
  settings: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    memoryEnabled: boolean;
  };
}

export interface ContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  tokenCount?: number;
  metadata?: {
    sources?: string[];
    confidence?: number;
    factChecked?: boolean;
  };
}

export interface UserMemory {
  id: string;
  userId: string;
  type: 'preference' | 'fact' | 'skill' | 'context';
  content: string;
  importance: number; // 1-10
  lastAccessed: Date;
  verified: boolean;
  embedding?: number[]; // For semantic search
}

export interface ContextSummary {
  id: string;
  conversationId: string;
  content: string;
  tokenCount: number;
  createdAt: Date;
  importantFacts: string[];
}

export class AdvancedContextManager {
  private activeContexts: Map<string, ConversationContext> = new Map();
  private userMemories: Map<string, UserMemory[]> = new Map();
  private readonly maxContextTokens = 128000; // Maximum context window
  private readonly summarizationThreshold = 0.8; // When to start summarizing
  
  // RAG Integration
  private vectorStore: EnhancedGCPVectorStore;
  private memoryManager: MemoryManager;
  private modelRouter = getModelRouter();

  constructor() {
    this.vectorStore = new EnhancedGCPVectorStore();
    this.memoryManager = new MemoryManager(this.vectorStore, this);
    this.initializeContextManager();
  }

  private async initializeContextManager(): Promise<void> {
    console.log('🧠 Initializing Advanced Context Manager with RAG');
    
    try {
      // Initialize RAG components (VectorStore initializes automatically)
      if (this.vectorStore.isInitialized()) {
        console.log('✅ Vector store ready for RAG operations');
      }
      
      // Load active contexts from storage
      await this.loadActiveContexts();
      await this.loadUserMemories();
      
      console.log('✅ Context Manager initialized with RAG capabilities');
    } catch (error) {
      console.error('❌ Failed to initialize context manager:', error);
    }
  }

  /**
   * Get or create a conversation context with RAG-enhanced memory injection
   */
  async getOrCreateContext(
    userId: string, 
    conversationId?: string,
    initialModel: string = 'gpt-4o'
  ): Promise<ConversationContext> {
    const contextId = conversationId || this.generateContextId();
    
    if (this.activeContexts.has(contextId)) {
      const context = this.activeContexts.get(contextId)!;
      context.metadata.lastActivity = new Date();
      return context;
    }

    // Create new context
    const newContext: ConversationContext = {
      id: contextId,
      userId,
      title: 'New Conversation',
      messages: [],
      metadata: {
        currentModel: initialModel,
        startedAt: new Date(),
        lastActivity: new Date(),
        tokenCount: 0,
      },
      settings: {
        memoryEnabled: true,
        temperature: 0.7,
        maxTokens: 4000,
      },
    };

    // Load user's persistent memory into context
    await this.injectUserMemory(newContext);

    this.activeContexts.set(contextId, newContext);
    await this.persistContext(newContext);

    console.log('🆕 Created new context:', contextId, 'for user:', userId);
    return newContext;
  }

  /**
   * Enhanced message addition with RAG memory extraction
   */
  async addMessage(
    contextId: string,
    message: Omit<ContextMessage, 'id' | 'timestamp'>
  ): Promise<void> {
    const context = this.activeContexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    const contextMessage: ContextMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
    };

    // Add message to context
    context.messages.push(contextMessage);
    context.metadata.lastActivity = new Date();
    context.metadata.tokenCount += this.estimateTokenCount(message.content);

    // Update conversation title if first user message
    if (message.role === 'user' && context.messages.filter(m => m.role === 'user').length === 1) {
      context.title = this.generateTitle(message.content);
    }

    // Enhanced memory extraction for user messages
    if (message.role === 'user') {
      await this.extractAndStoreUserMemories(context.userId, message.content, contextId);
    }

    // Check if context needs compression
    if (this.shouldCompressContext(context)) {
      await this.compressContext(context);
    }

    await this.persistContext(context);
    
    // Process for RAG if conversation has sufficient content (async to not block)
    if (context.messages.length >= 4) {
      this.memoryManager.processConversationForRAG(context.userId, contextId)
        .catch(error => console.warn('Failed to process for RAG:', error));
    }

    console.log('💬 Added message to context:', contextId, 'Role:', message.role);
  }

  /**
   * RAG-enhanced context retrieval for model consumption
   */
  async getContextForModel(contextId: string): Promise<ContextMessage[]> {
    const context = this.activeContexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    let messages = [...context.messages];

    // Add RAG-enhanced memory context if enabled
    if (context.settings.memoryEnabled) {
      const memoryContext = await this.getRelevantMemoryWithRAG(context.userId, context);
      if (memoryContext.length > 0) {
        const memoryMessage: ContextMessage = {
          id: 'memory-context-rag',
          role: 'system',
          content: this.formatEnhancedMemoryContext(memoryContext),
          timestamp: new Date(),
        };
        messages = [memoryMessage, ...messages];
      }
    }

    // Add anti-hallucination prompt
    const factCheckPrompt: ContextMessage = {
      id: 'fact-check-prompt',
      role: 'system',
      content: this.getAntiHallucinationPrompt(),
      timestamp: new Date(),
    };
    messages = [factCheckPrompt, ...messages];

    return messages;
  }

  /**
   * Enhanced memory injection using RAG vector search
   */
  private async injectUserMemory(context: ConversationContext): Promise<void> {
    if (!context.settings.memoryEnabled) return;

    try {
      // Get user's relevant memories for context enhancement
      const relevantMemories = await this.memoryManager.getRelevantMemoriesForContext(
        context.userId,
        'user profile and preferences',
        'preference'
      );
      
      if (relevantMemories.formatted) {
        const memoryMessage: ContextMessage = {
          id: 'user-profile-memory',
          role: 'system',
          content: relevantMemories.formatted,
          timestamp: new Date(),
        };
        context.messages.unshift(memoryMessage);
      }
    } catch (error) {
      console.warn('Failed to inject user memory:', error);
    }
  }

  /**
   * Enhanced memory retrieval using RAG
   */
  private async getRelevantMemoryWithRAG(
    userId: string, 
    context: ConversationContext
  ): Promise<MemoryResult[]> {
    try {
      const lastUserMessage = context.messages
        .filter(m => m.role === 'user')
        .slice(-1)[0];

      if (!lastUserMessage) return [];

      // Search for relevant memories using vector similarity
      const relevantMemories = await this.vectorStore.searchRelevantMemories(
        userId, 
        lastUserMessage.content, 
        5 // Top 5 most relevant memories
      );

      return relevantMemories;
    } catch (error) {
      console.warn('Failed to get relevant memory with RAG:', error);
      return [];
    }
  }

  /**
   * Extract and store user memories using AI
   */
  private async extractAndStoreUserMemories(
    userId: string, 
    content: string, 
    conversationId: string
  ): Promise<void> {
    try {
      // Use the extractMemoryTypes method through the analyzeAndExtractMemories
      const fakeConversation: ConversationContext = {
        id: conversationId,
        userId,
        title: 'Memory Extraction',
        messages: [{
          id: 'temp',
          role: 'user',
          content,
          timestamp: new Date()
        }],
        metadata: {
          currentModel: 'gpt-4o',
          startedAt: new Date(),
          lastActivity: new Date(),
          tokenCount: 0
        },
        settings: {
          memoryEnabled: true
        }
      };

      const extractedMemories = await this.memoryManager.analyzeAndExtractMemories(
        userId,
        fakeConversation
      );

      if (extractedMemories.length > 0) {
        await this.vectorStore.storeMemories(userId, extractedMemories);
        console.log(`🧠 Extracted ${extractedMemories.length} memories from user message`);
      }
    } catch (error) {
      console.warn('Failed to extract user memories:', error);
    }
  }

  /**
   * Format enhanced memory context for model consumption
   */
  private formatEnhancedMemoryContext(memories: MemoryResult[]): string {
    if (memories.length === 0) return '';

    const grouped = memories.reduce((acc, memory) => {
      const type = memory.metadata?.type || 'general';
      if (!acc[type]) acc[type] = [];
      acc[type].push(memory);
      return acc;
    }, {} as Record<string, MemoryResult[]>);

    let context = `## User Memory Context\n\n`;

    Object.entries(grouped).forEach(([type, typeMemories]) => {
      context += `### ${type.charAt(0).toUpperCase() + type.slice(1)}:\n`;
      typeMemories.forEach(memory => {
        context += `- ${memory.content} (confidence: ${Math.round(memory.relevanceScore * 100)}%)\n`;
      });
      context += '\n';
    });

    context += `*Use this context to personalize responses while being transparent about what you remember.*\n\n`;

    return context;
  }

  /**
   * Format user memories for context injection
   */
  private formatUserMemories(memories: ExtractedMemory[]): string {
    if (!memories || memories.length === 0) return '';

    let context = `## User Context\n\n`;

    const preferences = memories.filter(m => m.type === 'preference');
    const skills = memories.filter(m => m.type === 'skill');
    const facts = memories.filter(m => m.type === 'fact');
    const goals = memories.filter(m => m.type === 'goal');

    if (preferences.length > 0) {
      context += `**Preferences**: ${preferences.map(p => p.content).join(', ')}\n\n`;
    }

    if (skills.length > 0) {
      context += `**Skills**: ${skills.map(s => s.content).join(', ')}\n\n`;
    }

    if (facts.length > 0) {
      context += `**Important Facts**: ${facts.map(f => f.content).join(', ')}\n\n`;
    }

    if (goals.length > 0) {
      context += `**Goals**: ${goals.map(g => g.content).join(', ')}\n\n`;
    }

    return context.length > 25 ? context : '';
  }

  /**
   * Enhanced context compression with RAG storage
   */
  private async compressContext(context: ConversationContext): Promise<void> {
    try {
      const messagesToCompress = context.messages.slice(0, -10); // Keep last 10 messages
      
      if (messagesToCompress.length === 0) return;

      // Create summary using AI
      const summaryPrompt = `Summarize this conversation focusing on key facts, decisions, and user preferences:

${messagesToCompress.map(m => `${m.role}: ${m.content}`).join('\n')}

Provide a concise summary that preserves important context.`;

      const summary = await this.modelRouter.generateText({
        model: 'gpt-4o-mini', // Cost-effective model for summarization
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.1,
        maxTokens: 500
      });

      // Store summary in conversation metadata
      context.metadata.summary = summary.content;
      
      // Remove compressed messages and add summary message
      context.messages = [
        {
          id: 'compression-summary',
          role: 'system',
          content: `Previous conversation summary: ${summary.content}`,
          timestamp: new Date(),
        },
        ...context.messages.slice(-10)
      ];

      // Update token count
      context.metadata.tokenCount = context.messages.reduce(
        (total, msg) => total + this.estimateTokenCount(msg.content), 
        0
      );

      console.log(`🗜️ Compressed context ${context.id}, summary: ${summary.content.slice(0, 100)}...`);
    } catch (error) {
      console.error('Failed to compress context:', error);
    }
  }

  /**
   * Database persistence implementation
   */
  private async persistContext(context: ConversationContext): Promise<void> {
    try {
      // Store in vector database for RAG
      await this.vectorStore.storeConversation(context.userId, context);
      
      // Store in primary database (Firestore)
      await this.storeContextInDatabase(context);
      
      console.log('💾 Persisted context:', context.id);
    } catch (error) {
      console.warn('Failed to persist context:', error);
    }
  }

  private async storeContextInDatabase(context: ConversationContext): Promise<void> {
    try {
      await conversationStore.storeConversation(context);
    } catch (error) {
      console.error('Failed to store context in database:', error);
    }
  }

  private async loadActiveContexts(): Promise<void> {
    try {
      // In production, you might want to load only recent active contexts
      console.log('📥 Loading active contexts from storage');
    } catch (error) {
      console.warn('Failed to load active contexts:', error);
    }
  }

  private async loadUserMemories(): Promise<void> {
    try {
      // User memories are now handled by VectorStoreManager
      console.log('📥 User memories managed by RAG system');
    } catch (error) {
      console.warn('Failed to load user memories:', error);
    }
  }

  /**
   * Load a specific conversation from database
   */
  async loadConversation(conversationId: string): Promise<ConversationContext | null> {
    try {
      const conversation = await conversationStore.loadConversation(conversationId);
      if (conversation) {
        this.activeContexts.set(conversationId, conversation);
        console.log(`📥 Loaded conversation ${conversationId} from database`);
      }
      return conversation;
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return null;
    }
  }

  /**
   * Get user conversations with pagination
   */
  async getUserConversations(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{
    conversations: ConversationContext[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      return await conversationStore.getUserConversations(userId, limit, offset);
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      return { conversations: [], total: 0, hasMore: false };
    }
  }

  /**
   * Enhanced context deletion with database cleanup
   */
  async deleteContext(contextId: string, userId: string): Promise<void> {
    try {
      // Remove from memory
      this.activeContexts.delete(contextId);
      
      // Remove from database
      await conversationStore.deleteConversation(contextId, userId);
      
      // Remove from vector store
      await this.vectorStore.deleteUserData(userId); // Note: This deletes all user data
      
      console.log('🗑️ Deleted context:', contextId);
    } catch (error) {
      console.error('Failed to delete context:', error);
      throw error;
    }
  }

     /**
    * Switch model within a conversation while preserving context
    */
   async switchModel(contextId: string, newModel: string): Promise<void> {
     const context = this.activeContexts.get(contextId);
     if (!context) {
       throw new Error(`Context ${contextId} not found`);
     }

     const oldModel = context.metadata.currentModel;
     context.metadata.currentModel = newModel;
     context.metadata.lastActivity = new Date();

     // Add system message about model switch
     await this.addMessage(contextId, {
       role: 'system',
       content: `Model switched from ${oldModel} to ${newModel}. Continuing conversation with full context.`,
       model: newModel,
     });

     console.log('🔄 Switched model:', oldModel, '→', newModel, 'for context:', contextId);
   }

   // Utility methods
  private shouldCompressContext(context: ConversationContext): boolean {
    return context.metadata.tokenCount > (this.maxContextTokens * this.summarizationThreshold);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTitle(content: string): string {
    // Simple title generation from first user message
    return content.substring(0, 50).trim() + (content.length > 50 ? '...' : '');
  }

  private getAntiHallucinationPrompt(): string {
    return `IMPORTANT: You are an AI assistant that must be accurate and honest.
- If you're not certain about a fact, say so explicitly
- Do not make up information or provide false details  
- When discussing recent events, acknowledge your knowledge cutoff
- If you need current information, suggest the user verify with reliable sources
- Use phrases like "I believe," "According to my training," or "I'm not certain, but..."
- Provide sources when possible and acknowledge limitations`;
  }

  async getUserContexts(userId: string): Promise<ConversationContext[]> {
    return Array.from(this.activeContexts.values()).filter(ctx => ctx.userId === userId);
  }

  /**
   * Get user's conversation statistics
   */
  async getUserStats(userId: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    memoryStats: any;
    recentActivity: Date | null;
  }> {
    try {
      const contexts = await this.getUserContexts(userId);
      const memoryStats = await this.memoryManager.getMemoryStats(userId);
      
      return {
        totalConversations: contexts.length,
        totalMessages: contexts.reduce((total, ctx) => total + ctx.messages.length, 0),
        memoryStats,
        recentActivity: contexts.length > 0 
          ? new Date(Math.max(...contexts.map(ctx => ctx.metadata.lastActivity.getTime())))
          : null
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        memoryStats: null,
        recentActivity: null
      };
    }
  }
}

// Singleton instance
export const contextManager = new AdvancedContextManager(); 