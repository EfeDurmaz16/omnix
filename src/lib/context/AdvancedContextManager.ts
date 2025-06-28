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

  constructor() {
    this.initializeContextManager();
  }

  private async initializeContextManager(): Promise<void> {
    console.log('🧠 Initializing Advanced Context Manager');
    
    // Load active contexts from storage
    try {
      await this.loadActiveContexts();
      await this.loadUserMemories();
    } catch (error) {
      console.error('❌ Failed to initialize context manager:', error);
    }
  }

  /**
   * Get or create a conversation context
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
   * Add a message to the context with smart compression
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

    // Check if context needs compression
    if (this.shouldCompressContext(context)) {
      await this.compressContext(context);
    }

    // Extract and store important information
    if (message.role === 'user') {
      await this.extractUserMemories(context.userId, message.content);
    }

    await this.persistContext(context);
    console.log('💬 Added message to context:', contextId, 'Role:', message.role);
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

  /**
   * Get formatted context for model consumption
   */
  async getContextForModel(contextId: string): Promise<ContextMessage[]> {
    const context = this.activeContexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    let messages = [...context.messages];

    // Add memory context if enabled
    if (context.settings.memoryEnabled) {
      const memoryContext = await this.getRelevantMemory(context.userId, context);
      if (memoryContext.length > 0) {
        const memoryMessage: ContextMessage = {
          id: 'memory-context',
          role: 'system',
          content: this.formatMemoryContext(memoryContext),
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

  // ... continuing in next part due to length limits
  
  private async injectUserMemory(context: ConversationContext): Promise<void> {
    // Placeholder - inject user memories into new context
    console.log('💉 Injecting user memory into context:', context.id);
  }

  // Utility methods and other private methods will continue...
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

  // Persistence methods (placeholder - implement with database)
  private async loadActiveContexts(): Promise<void> {
    console.log('📥 Loading active contexts from storage');
  }

  private async loadUserMemories(): Promise<void> {
    console.log('📥 Loading user memories from storage');
  }

  private async persistContext(context: ConversationContext): Promise<void> {
    console.log('💾 Persisting context:', context.id);
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

  // Missing methods implementation
  private async compressContext(context: ConversationContext): Promise<void> {
    console.log('🗜️ Compressing context:', context.id);
    // Simple compression - keep last 10 messages + summary
    const keepCount = 10;
    if (context.messages.length > keepCount) {
      const oldMessages = context.messages.slice(0, -keepCount);
      const summary = oldMessages.map(m => `${m.role}: ${m.content}`).join('\n');
      context.metadata.summary = summary.substring(0, 500) + '...';
      context.messages = context.messages.slice(-keepCount);
    }
  }

  private async extractUserMemories(userId: string, content: string): Promise<void> {
    console.log('🧠 Extracting user memories for:', userId);
    // Simple memory extraction - look for preferences and facts
    if (content.toLowerCase().includes('i prefer') || content.toLowerCase().includes('my name is')) {
      // In real implementation, this would store to database
    }
  }

  private async getRelevantMemory(userId: string, context: ConversationContext): Promise<UserMemory[]> {
    console.log('🔍 Getting relevant memory for:', userId);
    // Return empty for now - in real implementation, would query stored memories
    return [];
  }

  private formatMemoryContext(memories: UserMemory[]): string {
    if (memories.length === 0) return '';
    return 'Previous context: ' + memories.map(m => m.content).join('; ');
  }

  // Additional methods would continue here...
  async getUserContexts(userId: string): Promise<ConversationContext[]> {
    return Array.from(this.activeContexts.values()).filter(ctx => ctx.userId === userId);
  }

  async deleteContext(contextId: string): Promise<void> {
    this.activeContexts.delete(contextId);
    console.log('🗑️ Deleted context:', contextId);
  }
}

// Singleton instance
export const contextManager = new AdvancedContextManager(); 