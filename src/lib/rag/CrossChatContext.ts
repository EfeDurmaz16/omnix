/**
 * Cross-Chat Context Manager
 * Handles persistent context across different chat sessions
 */

import { getMemoryConfigForPlan } from '../config/memory-config';
import { userService } from '../user/UserService';

export interface CrossChatMetadata {
  totalConversations: number;
  retainedConversations: number;
  lastContextUpdate: Date;
  contextEnabled: boolean;
  userPlan: string;
  memoryLimits: {
    maxConversations: number;
    maxPerQuery: number;
    retentionDays: number;
  };
}

export class CrossChatContextManager {
  /**
   * Get cross-chat context metadata for a user
   */
  async getContextMetadata(userId: string): Promise<CrossChatMetadata> {
    const userPlan = await userService.getUserPlan(userId);
    const config = getMemoryConfigForPlan(userPlan);
    
    return {
      totalConversations: 0, // Will be populated by actual count
      retainedConversations: 0, // Will be populated by actual count
      lastContextUpdate: new Date(),
      contextEnabled: config.crossChatContextEnabled,
      userPlan,
      memoryLimits: {
        maxConversations: config.maxConversationsToRetain,
        maxPerQuery: config.maxConversationsPerQuery,
        retentionDays: config.contextRetentionDays
      }
    };
  }

  /**
   * Check if cross-chat context is available for a query
   */
  async hasContextForQuery(userId: string, query: string): Promise<boolean> {
    const userPlan = await userService.getUserPlan(userId);
    const config = getMemoryConfigForPlan(userPlan);
    
    if (!config.crossChatContextEnabled) {
      return false;
    }

    // Check if query is context-seeking
    const contextKeywords = [
      'remember', 'previous', 'earlier', 'before', 'last time', 'yesterday',
      'continue', 'context', 'what did', 'you said', 'we discussed',
      'hatırla', 'önceki', 'daha önce', 'geçen', 'devam et'
    ];
    
    const lowerQuery = query.toLowerCase();
    return contextKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Format context information for display
   */
  formatContextInfo(metadata: CrossChatMetadata): string {
    if (!metadata.contextEnabled) {
      return '🔒 Cross-chat context disabled';
    }

    const retentionInfo = metadata.memoryLimits.retentionDays === 30 
      ? '1 month' 
      : metadata.memoryLimits.retentionDays === 7 
      ? '1 week' 
      : `${metadata.memoryLimits.retentionDays} days`;

    return `🧠 Context: ${metadata.retainedConversations}/${metadata.memoryLimits.maxConversations} conversations (${retentionInfo} retention)`;
  }

  /**
   * Get context status for UI display
   */
  getContextStatus(metadata: CrossChatMetadata): 'active' | 'limited' | 'disabled' {
    if (!metadata.contextEnabled) return 'disabled';
    if (metadata.userPlan === 'FREE') return 'limited';
    return 'active';
  }
}

export const crossChatContext = new CrossChatContextManager();