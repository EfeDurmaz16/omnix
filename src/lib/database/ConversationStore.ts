import { Firestore } from '@google-cloud/firestore';
import { ConversationContext, ContextMessage } from '../context/AdvancedContextManager';
import { firestore } from '../gcp-storage';

export interface StoredConversation {
  id: string;
  userId: string;
  title: string;
  messages: StoredMessage[];
  metadata: {
    currentModel: string;
    startedAt: string;
    lastActivity: string;
    tokenCount: number;
    summary?: string;
    cost?: number;
    messageCount: number;
  };
  settings: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    memoryEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  tokenCount?: number;
  metadata?: {
    sources?: string[];
    confidence?: number;
    factChecked?: boolean;
    cost?: number;
  };
}

export class ConversationStore {
  private db: Firestore;
  private readonly COLLECTION = 'conversations';
  private readonly MESSAGES_COLLECTION = 'messages';

  constructor() {
    this.db = firestore;
  }

  /**
   * Store a conversation context in Firestore
   */
  async storeConversation(context: ConversationContext): Promise<void> {
    try {
      const storedConversation: StoredConversation = {
        id: context.id,
        userId: context.userId,
        title: context.title,
        messages: context.messages.map(this.messageToStored),
        metadata: {
          currentModel: context.metadata.currentModel,
          startedAt: context.metadata.startedAt.toISOString(),
          lastActivity: context.metadata.lastActivity.toISOString(),
          tokenCount: context.metadata.tokenCount,
          summary: context.metadata.summary,
          messageCount: context.messages.length,
        },
        settings: context.settings,
        createdAt: context.metadata.startedAt.toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.db.collection(this.COLLECTION).doc(context.id).set(storedConversation);
      
      console.log(`💾 Stored conversation ${context.id} to Firestore`);
    } catch (error) {
      console.error('Failed to store conversation:', error);
      throw error;
    }
  }

  /**
   * Load a conversation context from Firestore
   */
  async loadConversation(conversationId: string): Promise<ConversationContext | null> {
    try {
      const doc = await this.db.collection(this.COLLECTION).doc(conversationId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data() as StoredConversation;
      return this.storedToContext(data);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return null;
    }
  }

  /**
   * Get all conversations for a user with pagination
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
      // Get total count
      const countQuery = await this.db
        .collection(this.COLLECTION)
        .where('userId', '==', userId)
        .count()
        .get();
      
      const total = countQuery.data().count;

      // Get conversations with pagination
      let query = this.db
        .collection(this.COLLECTION)
        .where('userId', '==', userId)
        .orderBy('metadata.lastActivity', 'desc')
        .limit(limit);

      if (offset > 0) {
        // For offset-based pagination, we need to use startAfter with a document
        const offsetQuery = await this.db
          .collection(this.COLLECTION)
          .where('userId', '==', userId)
          .orderBy('metadata.lastActivity', 'desc')
          .limit(offset)
          .get();
        
        if (!offsetQuery.empty) {
          const lastDoc = offsetQuery.docs[offsetQuery.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }

      const querySnapshot = await query.get();
      
      const conversations = querySnapshot.docs.map(doc => {
        const data = doc.data() as StoredConversation;
        return this.storedToContext(data);
      });

      return {
        conversations,
        total,
        hasMore: offset + conversations.length < total
      };
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      return { conversations: [], total: 0, hasMore: false };
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      const doc = await this.db.collection(this.COLLECTION).doc(conversationId).get();
      
      if (!doc.exists) {
        throw new Error('Conversation not found');
      }

      const data = doc.data() as StoredConversation;
      if (data.userId !== userId) {
        throw new Error('Unauthorized to delete this conversation');
      }

      await this.db.collection(this.COLLECTION).doc(conversationId).delete();
      console.log(`🗑️ Deleted conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }

  /**
   * Update conversation metadata
   */
  async updateConversationMetadata(
    conversationId: string, 
    updates: Partial<StoredConversation['metadata']>
  ): Promise<void> {
    try {
      await this.db.collection(this.COLLECTION).doc(conversationId).update({
        metadata: updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update conversation metadata:', error);
      throw error;
    }
  }

  /**
   * Search conversations by content
   */
  async searchConversations(
    userId: string, 
    searchTerm: string, 
    limit: number = 10
  ): Promise<ConversationContext[]> {
    try {
      // Firestore doesn't support full-text search natively
      // This is a basic implementation - for production, consider using Algolia or similar
      const querySnapshot = await this.db
        .collection(this.COLLECTION)
        .where('userId', '==', userId)
        .orderBy('metadata.lastActivity', 'desc')
        .limit(50) // Get more to filter locally
        .get();

      const conversations = querySnapshot.docs
        .map(doc => doc.data() as StoredConversation)
        .filter(conv => 
          conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.messages.some(msg => 
            msg.content.toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
        .slice(0, limit)
        .map(data => this.storedToContext(data));

      return conversations;
    } catch (error) {
      console.error('Failed to search conversations:', error);
      return [];
    }
  }

  /**
   * Get conversation statistics for a user
   */
  async getUserStats(userId: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    modelsUsed: Record<string, number>;
    recentActivity: Date | null;
  }> {
    try {
      const querySnapshot = await this.db
        .collection(this.COLLECTION)
        .where('userId', '==', userId)
        .get();

      let totalMessages = 0;
      let totalTokens = 0;
      let totalCost = 0;
      const modelsUsed: Record<string, number> = {};
      let lastActivity: Date | null = null;

      querySnapshot.docs.forEach(doc => {
        const data = doc.data() as StoredConversation;
        totalMessages += data.metadata.messageCount;
        totalTokens += data.metadata.tokenCount;
        totalCost += data.metadata.cost || 0;
        
        modelsUsed[data.metadata.currentModel] = 
          (modelsUsed[data.metadata.currentModel] || 0) + 1;

        const activity = new Date(data.metadata.lastActivity);
        if (!lastActivity || activity > lastActivity) {
          lastActivity = activity;
        }
      });

      return {
        totalConversations: querySnapshot.size,
        totalMessages,
        totalTokens,
        totalCost,
        modelsUsed,
        recentActivity: lastActivity
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        modelsUsed: {},
        recentActivity: null
      };
    }
  }

  /**
   * Archive old conversations (move to cold storage)
   */
  async archiveOldConversations(
    userId: string, 
    daysOld: number = 90
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const querySnapshot = await this.db
        .collection(this.COLLECTION)
        .where('userId', '==', userId)
        .where('metadata.lastActivity', '<', cutoffDate.toISOString())
        .get();

      const batch = this.db.batch();
      let archivedCount = 0;

      querySnapshot.docs.forEach(doc => {
        // Move to archived collection
        const archivedRef = this.db.collection('archived_conversations').doc(doc.id);
        batch.set(archivedRef, { ...doc.data(), archivedAt: new Date().toISOString() });
        
        // Delete from main collection
        batch.delete(doc.ref);
        archivedCount++;
      });

      if (archivedCount > 0) {
        await batch.commit();
        console.log(`📦 Archived ${archivedCount} old conversations for user ${userId}`);
      }

      return archivedCount;
    } catch (error) {
      console.error('Failed to archive conversations:', error);
      return 0;
    }
  }

  /**
   * Convert stored format to context format
   */
  private storedToContext(stored: StoredConversation): ConversationContext {
    return {
      id: stored.id,
      userId: stored.userId,
      title: stored.title,
      messages: stored.messages.map(this.storedToMessage),
      metadata: {
        currentModel: stored.metadata.currentModel,
        startedAt: new Date(stored.metadata.startedAt),
        lastActivity: new Date(stored.metadata.lastActivity),
        tokenCount: stored.metadata.tokenCount,
        summary: stored.metadata.summary,
      },
      settings: stored.settings,
    };
  }

  /**
   * Convert context format to stored format
   */
  private messageToStored(message: ContextMessage): StoredMessage {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      model: message.model,
      tokenCount: message.tokenCount,
      metadata: message.metadata,
    };
  }

  /**
   * Convert stored format to message format
   */
  private storedToMessage(stored: StoredMessage): ContextMessage {
    return {
      id: stored.id,
      role: stored.role,
      content: stored.content,
      timestamp: new Date(stored.timestamp),
      model: stored.model,
      tokenCount: stored.tokenCount,
      metadata: stored.metadata,
    };
  }
}

// Singleton instance
export const conversationStore = new ConversationStore(); 