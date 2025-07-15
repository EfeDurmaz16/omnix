import { firestore } from '../gcp-storage';
import OpenAI from 'openai';

export interface ConversationMemory {
  id: string;
  userId: string;
  conversationId: string;
  messages: Array<{
    content: string;
    role: 'user' | 'assistant';
    timestamp: string;
    embedding?: number[];
    messageId: string;
  }>;
  metadata: {
    chatId: string;
    messageCount?: number;
    tokenCount?: number;
    memoryLevel?: string;
    importance?: number;
    topics?: string[];
    accessCount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  storageType?: string;
}

export interface UserProfile {
  userId: string;
  facts: string[];
  preferences: string[];
  skills: string[];
  lastUpdated: Date;
}

export interface ContextResult {
  conversationContext: ConversationMemory[];
  chatContext: ConversationMemory[];
  userContext: ConversationMemory[];
  totalFound: number;
}

/**
 * Clean, hierarchical memory store with user isolation
 * Structure: User -> Chat -> Conversation -> Messages
 */
export class CleanMemoryStore {
  private openai: OpenAI;
  private readonly MAX_CONVERSATIONS_PER_USER = 100;
  private readonly MAX_CONTEXT_ITEMS = 10;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Store a conversation with embedding for semantic search
   * Works with existing user-vectors structure
   */
  async storeConversation(
    userId: string,
    chatId: string,
    conversationId: string,
    content: string,
    role: 'user' | 'assistant',
    metadata?: { messageCount: number; tokenCount: number }
  ): Promise<void> {
    try {
      // Debug input parameters
      console.log('🔧 DEBUG: storeConversation called with:', {
        userId: userId?.substring(0, 20) + '...' || 'undefined',
        chatId: chatId || 'undefined',
        conversationId: conversationId || 'undefined',
        content: content?.substring(0, 100) + '...' || 'undefined',
        role: role || 'undefined',
        metadata: metadata || 'undefined'
      });

      // Validate required parameters
      if (!userId || !chatId || !conversationId || !content || !role) {
        console.error('❌ Missing required parameters:', { userId: !!userId, chatId: !!chatId, conversationId: !!conversationId, content: !!content, role: !!role });
        throw new Error('Missing required parameters for storeConversation');
      }

      // Generate embedding for semantic search
      const embedding = await this.generateEmbedding(content);
      
      const docId = `${userId}-${conversationId}`;
      const docRef = firestore.collection('user-vectors').doc(docId);
      
      // Check if document exists
      const existingDoc = await docRef.get();
      
      if (existingDoc.exists) {
        // Update existing document by adding new message
        const existingData = existingDoc.data() as ConversationMemory;
        const newMessage = {
          content: content.substring(0, 2000),
          role,
          timestamp: new Date().toISOString(),
          embedding,
          messageId: `msg_${Date.now()}`
        };
        
        await docRef.update({
          messages: [...existingData.messages, newMessage],
          'metadata.messageCount': (existingData.metadata?.messageCount || 0) + 1,
          'metadata.tokenCount': (existingData.metadata?.tokenCount || 0) + (metadata?.tokenCount || 0),
          updatedAt: new Date()
        });
        
        console.log(`✅ Updated existing conversation: ${docId}`);
      } else {
        // Create new document
        const memory: ConversationMemory = {
          id: docId,
          userId,
          conversationId,
          messages: [{
            content: content.substring(0, 2000),
            role,
            timestamp: new Date().toISOString(),
            embedding,
            messageId: `msg_${Date.now()}`
          }],
          metadata: {
            chatId,
            messageCount: metadata?.messageCount || 1,
            tokenCount: metadata?.tokenCount || 0,
            memoryLevel: 'conversation',
            importance: 1,
            topics: [],
            accessCount: 0
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          storageType: 'firestore'
        };

        console.log('🔧 DEBUG: Memory object to store:', {
          id: memory.id,
          userId: memory.userId?.substring(0, 20) + '...' || 'undefined',
          chatId: memory.metadata.chatId || 'undefined',
          conversationId: memory.conversationId || 'undefined',
          messageCount: memory.messages.length
        });

        await docRef.set(memory);
        console.log(`✅ Created new conversation: ${docId}`);
      }

    } catch (error) {
      console.error('❌ Failed to store conversation:', error);
      throw error;
    }
  }

  /**
   * Fast hierarchical context retrieval
   * Priority: 1. Current conversation -> 2. Current chat -> 3. Other user chats
   */
  async getHierarchicalContext(
    userId: string,
    chatId: string,
    conversationId: string,
    query: string
  ): Promise<ContextResult> {
    console.log(`🔍 Getting hierarchical context for user ${userId}, chat ${chatId}, conversation ${conversationId}`);
    console.log(`🔍 Query: "${query}"`);
    
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      console.log(`🔍 Generated query embedding: ${queryEmbedding.length} dimensions`);
      
      // Level 1: Current conversation context (fastest)
      console.log(`🔍 Level 1: Getting current conversation context...`);
      const conversationContext = await this.getCurrentConversationContext(
        userId, chatId, conversationId
      );
      console.log(`📊 Level 1 result: ${conversationContext.length} conversation messages`);
      
      // Level 2: Current chat context (fast)
      console.log(`🔍 Level 2: Getting current chat context...`);
      const chatContext = await this.getCurrentChatContext(
        userId, chatId, conversationId, queryEmbedding
      );
      console.log(`📊 Level 2 result: ${chatContext.length} chat messages`);
      
      // Level 3: User's other chats context (broader)
      console.log(`🔍 Level 3: Getting cross-chat context...`);
      const userContext = await this.getUserCrossChatsContext(
        userId, chatId, queryEmbedding
      );
      console.log(`📊 Level 3 result: ${userContext.length} cross-chat messages`);

      const result: ContextResult = {
        conversationContext,
        chatContext,
        userContext,
        totalFound: conversationContext.length + chatContext.length + userContext.length
      };

      console.log(`📊 Final context summary: ${conversationContext.length} conversation + ${chatContext.length} chat + ${userContext.length} cross-chat = ${result.totalFound} total`);
      
      if (result.totalFound > 0) {
        console.log(`✅ Found ${result.totalFound} relevant memories for context injection`);
      } else {
        console.log(`⚠️ No relevant memories found - checking database directly...`);
        
        // Debug: Check what's actually in the database
        const allUserDocs = await firestore
          .collection('user-vectors')
          .where('userId', '==', userId)
          .limit(5)
          .get();
        
        console.log(`🔍 Debug - Total documents for user in database: ${allUserDocs.size}`);
        if (allUserDocs.size > 0) {
          allUserDocs.forEach(doc => {
            const data = doc.data();
            const content = data.content || 'undefined';
            console.log(`📄 Document ${doc.id}: chatId=${data.chatId}, conversationId=${data.conversationId}, content="${content.substring(0, 100)}..."`);
          });
        }
      }
      
      return result;

    } catch (error) {
      console.error('❌ Failed to get hierarchical context:', error);
      return {
        conversationContext: [],
        chatContext: [],
        userContext: [],
        totalFound: 0
      };
    }
  }

  /**
   * Level 1: Get current conversation context (immediate messages)
   */
  private async getCurrentConversationContext(
    userId: string,
    chatId: string,
    conversationId: string
  ): Promise<ConversationMemory[]> {
    try {
      console.log(`🔍 Level 1 Query: userId=${userId}, chatId=${chatId}, conversationId=${conversationId}`);
      
      // Get specific conversation document
      const docRef = firestore.collection('user-vectors').doc(`${userId}-${conversationId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`⚠️ Level 1 found no conversation document`);
        return [];
      }

      const data = doc.data() as ConversationMemory;
      console.log(`📊 Level 1 Query result: Found conversation with ${data.messages?.length || 0} messages`);
      
      // Return the conversation document containing all messages
      const results = [data];
      
      if (results.length > 0) {
        console.log(`✅ Level 1 found ${results.length} conversation document with ${data.messages?.length || 0} messages`);
        data.messages?.forEach((msg, idx) => {
          const content = msg.content || 'undefined';
          console.log(`  ${idx + 1}. ${msg.role}: "${content.substring(0, 100)}..."`);
        });
      } else {
        console.log(`⚠️ Level 1 found no conversation messages`);
      }
      
      return results;
    } catch (error) {
      console.warn('⚠️ Failed to get conversation context:', error);
      return [];
    }
  }

  /**
   * Level 2: Get current chat context (other conversations in same chat)
   */
  private async getCurrentChatContext(
    userId: string,
    chatId: string,
    currentConversationId: string,
    queryEmbedding: number[]
  ): Promise<ConversationMemory[]> {
    try {
      console.log(`🔍 Level 2 Query: userId=${userId}, chatId=${chatId}, excluding conversationId=${currentConversationId}`);
      
      // Query using existing index: userId + createdAt  
      const snapshot = await firestore
        .collection('user-vectors')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50) // Get more results to filter
        .get();

      console.log(`📊 Level 2 Raw query result: ${snapshot.size} documents found`);
      
      const conversations = snapshot.docs
        .map(doc => doc.data() as ConversationMemory)
        .filter(conv => 
          conv.metadata?.chatId === chatId && 
          conv.conversationId !== currentConversationId
        );

      console.log(`📊 Level 2 After filtering: ${conversations.length} documents (excluded current conversation)`);
      
      if (conversations.length > 0) {
        console.log(`🔍 Level 2 conversations found:`);
        conversations.forEach((conv, idx) => {
          const firstMessage = conv.messages?.[0];
          const content = firstMessage?.content || 'undefined';
          console.log(`  ${idx + 1}. conversationId=${conv.conversationId}, chatId=${conv.metadata?.chatId}, content="${content.substring(0, 100)}..."`);
        });
      }

      // Rank by semantic similarity
      const ranked = this.rankBySimilarity(conversations, queryEmbedding, 3);
      console.log(`📊 Level 2 Final result: ${ranked.length} documents after similarity ranking`);
      
      return ranked;
    } catch (error) {
      console.warn('⚠️ Failed to get chat context:', error);
      return [];
    }
  }

  /**
   * Level 3: Get user's cross-chat context (other chats)
   */
  private async getUserCrossChatsContext(
    userId: string,
    currentChatId: string,
    queryEmbedding: number[]
  ): Promise<ConversationMemory[]> {
    try {
      console.log(`🔍 Level 3 Query: userId=${userId}, excluding chatId=${currentChatId}`);
      
      // Query using existing index: userId + createdAt
      const snapshot = await firestore
        .collection('user-vectors')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50) // Recent conversations across all chats
        .get();

      console.log(`📊 Level 3 Raw query result: ${snapshot.size} documents found`);

      const conversations = snapshot.docs
        .map(doc => doc.data() as ConversationMemory)
        .filter(conv => conv.metadata?.chatId !== currentChatId);

      console.log(`📊 Level 3 After filtering: ${conversations.length} documents (excluded current chat)`);
      
      if (conversations.length > 0) {
        console.log(`🔍 Level 3 cross-chat conversations found:`);
        conversations.forEach((conv, idx) => {
          const firstMessage = conv.messages?.[0];
          const content = firstMessage?.content || 'undefined';
          console.log(`  ${idx + 1}. chatId=${conv.metadata?.chatId}, conversationId=${conv.conversationId}, content="${content.substring(0, 100)}..."`);
        });
      }

      // Rank by semantic similarity
      const ranked = this.rankBySimilarity(conversations, queryEmbedding, 3);
      console.log(`📊 Level 3 Final result: ${ranked.length} documents after similarity ranking`);
      
      return ranked;
    } catch (error) {
      console.warn('⚠️ Failed to get cross-chat context:', error);
      return [];
    }
  }

  /**
   * Rank conversations by semantic similarity to query
   */
  private rankBySimilarity(
    conversations: ConversationMemory[],
    queryEmbedding: number[],
    limit: number
  ): ConversationMemory[] {
    console.log(`🔍 Ranking ${conversations.length} conversations by similarity`);
    console.log(`🔍 Query embedding dimensions: ${queryEmbedding.length}`);
    
    const conversationsWithEmbeddings = conversations.filter(conv => 
      conv.messages && conv.messages.some(msg => msg.embedding && msg.embedding.length > 0)
    );
    console.log(`📊 ${conversationsWithEmbeddings.length}/${conversations.length} conversations have embeddings`);
    
    if (conversationsWithEmbeddings.length === 0) {
      console.log(`⚠️ No conversations with embeddings found for similarity ranking`);
      return [];
    }
    
    const withSimilarity = conversationsWithEmbeddings
      .map(conv => {
        // Calculate similarity using the best matching message embedding
        let bestSimilarity = 0;
        let bestMessage = null;
        
        for (const msg of conv.messages || []) {
          if (msg.embedding && msg.embedding.length > 0) {
            const similarity = this.cosineSimilarity(queryEmbedding, msg.embedding);
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              bestMessage = msg;
            }
          }
        }
        
        const content = bestMessage?.content || conv.messages?.[0]?.content || 'undefined';
        console.log(`📊 Similarity for "${content.substring(0, 50)}...": ${bestSimilarity.toFixed(4)}`);
        return {
          conversation: conv,
          similarity: bestSimilarity
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    console.log(`✅ Top ${withSimilarity.length} conversations after similarity ranking:`);
    withSimilarity.forEach((item, idx) => {
      const content = item.conversation.messages?.[0]?.content || 'undefined';
      console.log(`  ${idx + 1}. Similarity: ${item.similarity.toFixed(4)}, Content: "${content.substring(0, 100)}..."`);
    });

    return withSimilarity.map(item => item.conversation);
  }

  /**
   * Format hierarchical context for AI injection
   * Simple, natural conversation context without over-categorization
   */
  formatHierarchicalContext(context: ContextResult): string {
    let formatted = '';

    // Current conversation context (most important)
    if (context.conversationContext.length > 0) {
      formatted += '# Current Conversation\n\n';
      for (const conv of context.conversationContext) {
        if (conv.messages && conv.messages.length > 0) {
          // Include recent messages from current conversation naturally
          const recentMessages = conv.messages.slice(-5); // Last 5 messages
          formatted += recentMessages
            .map(msg => `${msg.role}: ${this.cleanContent(msg.content)}`)
            .join('\n');
        }
      }
      formatted += '\n\n';
    }

    // Recent chat history
    if (context.chatContext.length > 0) {
      formatted += '# Recent Chat History\n\n';
      formatted += context.chatContext
        .slice(0, 3) // Only show 3 most recent
        .map(conv => {
          const firstMessage = conv.messages?.[0];
          if (firstMessage) {
            const content = this.cleanContent(firstMessage.content);
            return `Previous: ${content.substring(0, 120)}...`;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
      formatted += '\n\n';
    }

    // Cross-chat context (very limited)
    if (context.userContext.length > 0) {
      formatted += '# Related Previous Conversations\n\n';
      formatted += context.userContext
        .slice(0, 2) // Only show 2 most relevant
        .map(conv => {
          const firstMessage = conv.messages?.[0];
          if (firstMessage) {
            const content = this.cleanContent(firstMessage.content);
            return `Earlier: ${content.substring(0, 100)}...`;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }

    return formatted.trim();
  }


  /**
   * Clean content by removing XML tags and problematic formatting
   */
  private cleanContent(content: string): string {
    if (!content) return content;
    
    // Remove XML-like tags
    return content
      .replace(/<\/?answer>/g, '')
      .replace(/<\/?think>/g, '')
      .replace(/<\/?reasoning>/g, '')
      .replace(/<\/?analysis>/g, '')
      .replace(/<\/?response>/g, '')
      .replace(/<\/?output>/g, '')
      .trim();
  }


  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit input size
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Cleanup old conversations to maintain performance
   */
  private async cleanupOldConversations(userId: string): Promise<void> {
    try {
      const snapshot = await firestore
        .collection('user-vectors')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .offset(this.MAX_CONVERSATIONS_PER_USER)
        .get();

      const batch = firestore.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`🗑️ Cleaned up ${snapshot.docs.length} old conversations for user ${userId}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup old conversations:', error);
    }
  }

  /**
   * Delete all data for a user (GDPR compliance)
   */
  async deleteUserData(userId: string): Promise<void> {
    try {
      const snapshot = await firestore
        .collection('user-vectors')
        .where('userId', '==', userId)
        .get();

      const batch = firestore.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`🗑️ Deleted all data for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to delete user data:', error);
      throw error;
    }
  }
}