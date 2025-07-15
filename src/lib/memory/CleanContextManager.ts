import { CleanMemoryStore, ContextResult } from './CleanMemoryStore';

export interface SimpleMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface SimpleContext {
  userId: string;
  chatId: string;
  conversationId: string;
  messages: SimpleMessage[];
  memoryEnabled: boolean;
}

/**
 * Clean, simple context manager with hierarchical memory
 * No complex caching, no hardcoded arrays, just fast hierarchical retrieval
 */
export class CleanContextManager {
  private memoryStore: CleanMemoryStore;

  constructor() {
    this.memoryStore = new CleanMemoryStore();
  }

  /**
   * Get context with hierarchical memory injection
   * Priority: Current conversation -> Current chat -> Cross-chat
   */
  async getContextWithMemory(context: SimpleContext): Promise<SimpleMessage[]> {
    console.log('🔧 DEBUG: CleanContextManager.getContextWithMemory called with:', {
      userId: context.userId.substring(0, 20) + '...',
      chatId: context.chatId,
      conversationId: context.conversationId,
      messageCount: context.messages.length,
      memoryEnabled: context.memoryEnabled
    });
    
    if (!context.memoryEnabled) {
      console.log('🔧 DEBUG: Memory disabled, returning original messages');
      return context.messages;
    }

    try {
      console.log(`🧠 Getting memory context for user ${context.userId}, chat ${context.chatId}`);
      
      // Get the user's last message for context search
      const lastUserMessage = [...context.messages]
        .reverse()
        .find(msg => msg.role === 'user');

      if (!lastUserMessage) {
        return context.messages;
      }

      // Get hierarchical context
      const memoryContext = await this.memoryStore.getHierarchicalContext(
        context.userId,
        context.chatId,
        context.conversationId,
        lastUserMessage.content
      );

      // Format and inject memory if found
      const formattedMemory = this.memoryStore.formatHierarchicalContext(memoryContext);
      
      if (formattedMemory.trim()) {
        console.log(`✅ Injecting ${memoryContext.totalFound} memory items into context`);
        
        const memoryMessage: SimpleMessage = {
          id: 'memory-context',
          role: 'system',
          content: `# Previous Context

${formattedMemory}

This is context from previous conversations with this user. Use it naturally to maintain continuity, but don't explicitly reference it unless relevant to the current conversation.`,
          timestamp: new Date()
        };

        // Inject memory at the beginning of messages
        return [memoryMessage, ...context.messages];
      } else {
        console.log('⚠️ No relevant memory found for context');
        return context.messages;
      }

    } catch (error) {
      console.error('❌ Failed to inject memory context:', error);
      return context.messages;
    }
  }

  /**
   * Store a completed conversation for future retrieval
   */
  async storeConversation(
    userId: string,
    chatId: string,
    conversationId: string,
    messages: SimpleMessage[]
  ): Promise<void> {
    try {
      console.log(`💾 Storing conversation ${conversationId} for user ${userId}`);
      console.log('🔧 DEBUG: storeConversation input parameters:', {
        userId: userId?.substring(0, 20) + '...' || 'undefined',
        chatId: chatId || 'undefined',
        conversationId: conversationId || 'undefined',
        messageCount: messages?.length || 0
      });

      // Store each significant message
      for (const message of messages) {
        // Skip system messages and very short messages
        if (message.role === 'system' || message.content.length < 10) {
          continue;
        }

        console.log('🔧 DEBUG: Processing message:', {
          role: message.role,
          content: message.content?.substring(0, 100) + '...' || 'undefined'
        });

        await this.memoryStore.storeConversation(
          userId,
          chatId,
          conversationId,
          message.content,
          message.role,
          {
            messageCount: messages.length,
            tokenCount: this.estimateTokenCount(message.content)
          }
        );
      }

      console.log(`✅ Stored conversation with ${messages.length} messages`);
    } catch (error) {
      console.error('❌ Failed to store conversation:', error);
    }
  }

  /**
   * Simple token estimation (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4); // Rough approximation: 4 chars = 1 token
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string): Promise<{
    totalConversations: number;
    recentActivity: Date | null;
  }> {
    try {
      // This would query the database for user stats
      // For now, return basic structure
      return {
        totalConversations: 0,
        recentActivity: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get memory stats:', error);
      return {
        totalConversations: 0,
        recentActivity: null
      };
    }
  }

  /**
   * Clear all memory for a user (GDPR compliance)
   */
  async clearUserMemory(userId: string): Promise<void> {
    try {
      await this.memoryStore.deleteUserData(userId);
      console.log(`🗑️ Cleared all memory for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to clear user memory:', error);
      throw error;
    }
  }

  /**
   * Extract chat ID from conversation ID
   * Handle formats: "chat_123", "chat_123_conv_456", "conv_123456789"
   */
  extractChatId(conversationId: string): string {
    const parts = conversationId.split('_');
    
    if (parts.length >= 2 && parts[0] === 'chat') {
      // Format: chat_123 or chat_123_conv_456
      return `${parts[0]}_${parts[1]}`;
    } else if (parts.length >= 2 && parts[0] === 'conv') {
      // Format: conv_123456789 -> convert to chat_123456789
      return `chat_${parts[1]}`;
    }
    
    // Fallback: create a chat ID from the conversation ID
    return `chat_${conversationId}`;
  }

  /**
   * Generate a conversation ID
   */
  generateConversationId(chatId: string): string {
    const timestamp = Date.now();
    return `${chatId}_conv_${timestamp}`;
  }
}