import { EnhancedGCPVectorStore, ExtractedMemory } from './EnhancedGCPVectorStore';
import { AdvancedContextManager, ConversationContext, ContextMessage } from '../context/AdvancedContextManager';
import { getModelRouter } from '../model-router';

export interface MemoryExtractionResult {
  preferences: ExtractedMemory[];
  skills: ExtractedMemory[];
  facts: ExtractedMemory[];
  goals: ExtractedMemory[];
  totalExtracted: number;
  confidence: number;
}

export interface ConversationSummary {
  id: string;
  userId: string;
  conversationId: string;
  summary: string;
  keyTopics: string[];
  modelsUsed: string[];
  totalTokens: number;
  totalCost: number;
  createdAt: Date;
}

export class MemoryManager {
  private vectorStore: EnhancedGCPVectorStore;
  private contextManager: AdvancedContextManager;
  private modelRouter = getModelRouter();

  constructor(
    vectorStore: EnhancedGCPVectorStore,
    contextManager: AdvancedContextManager
  ) {
    this.vectorStore = vectorStore;
    this.contextManager = contextManager;
  }

  /**
   * Initialize memory space for a new user (simplified for GCP)
   */
  async initializeUserMemory(userId: string): Promise<void> {
    // GCP Firestore handles user namespacing automatically
    console.log(`✅ Initialized memory space for user: ${userId}`);
  }

  /**
   * Process a completed conversation and extract memories
   */
  async processConversationForRAG(userId: string, conversationId: string): Promise<void> {
    try {
      const context = await this.contextManager.getOrCreateContext(userId, conversationId);
      
      // Store conversation in vector database
      await this.vectorStore.storeConversation(userId, context);
      
      // Extract and store memories
      const extractedMemories = await this.analyzeAndExtractMemories(userId, context);
      
      if (extractedMemories.length > 0) {
        await this.vectorStore.storeMemories(userId, extractedMemories);
      }
      
      // Create conversation summary
      await this.createConversationSummary(userId, context);
      
      console.log(`🧠 Processed conversation ${conversationId} for user ${userId}: ${extractedMemories.length} memories extracted`);
    } catch (error) {
      console.error('Failed to process conversation for RAG:', error);
    }
  }

  /**
   * Extract different types of memories from a conversation
   */
  async analyzeAndExtractMemories(
    userId: string, 
    conversation: ConversationContext
  ): Promise<ExtractedMemory[]> {
    const memories: ExtractedMemory[] = [];
    
    // Process user messages for memory extraction
    const userMessages = conversation.messages.filter(msg => msg.role === 'user');
    
    for (const message of userMessages) {
      try {
        const extracted = await this.extractMemoryTypes(message.content, conversation.id);
        memories.push(...extracted);
      } catch (error) {
        console.warn('Failed to extract memories from message:', message.id, error);
      }
    }
    
    return memories;
  }

  /**
   * Use AI to extract different types of memories from user input
   */
  private async extractMemoryTypes(content: string, conversationId: string): Promise<ExtractedMemory[]> {
    if (content.length < 10) {
      return []; // Skip very short messages
    }

    try {
      const prompt = `Analyze this user message and extract any important information about the user:

Message: "${content}"

Extract and categorize any:
1. Personal preferences (I like, I prefer, I hate, I enjoy, I dislike)
2. Skills/expertise (I work in, I'm experienced with, I know how to, I've worked on)
3. Personal facts (My name is, I live in, I am, I have, I work at)
4. Goals/objectives (I want to, I'm trying to, I plan to, I need to)

Return a JSON array of objects with this format:
[
  {
    "type": "preference|skill|fact|goal",
    "content": "extracted information",
    "confidence": 0.0-1.0
  }
]

Only include items that are clearly about the user personally. Return empty array [] if nothing relevant found.`;

      const response = await this.modelRouter.generateText({
        model: 'gpt-4o-mini', // Cost-effective for extraction
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 500,
      });

      const extracted = this.parseMemoryExtraction(response.content, conversationId);
      
      // Filter out low-confidence extractions
      return extracted.filter(memory => memory.confidence >= 0.6);
    } catch (error) {
      console.error('Failed to extract memory types:', error);
      return [];
    }
  }

  /**
   * Parse the AI response and create ExtractedMemory objects
   */
  private parseMemoryExtraction(response: string, conversationId: string): ExtractedMemory[] {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
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
          ['preference', 'skill', 'fact', 'goal'].includes(item.type)
        )
        .map(item => ({
          type: item.type as ExtractedMemory['type'],
          content: item.content.trim(),
          confidence: Math.min(Math.max(item.confidence || 0.5, 0), 1),
          extractedFrom: conversationId,
          timestamp: new Date(),
        }));
    } catch (error) {
      console.warn('Failed to parse memory extraction response:', error);
      return [];
    }
  }

  /**
   * Get relevant memories for enhancing user context
   */
  async getRelevantMemoriesForContext(
    userId: string, 
    query: string,
    contextType: 'conversation' | 'preference' | 'skill' = 'conversation'
  ): Promise<{ 
    conversationMemories: any[];
    userMemories: ExtractedMemory[];
    formatted: string;
  }> {
    try {
      const [conversationMemories, userMemories] = await Promise.all([
        this.vectorStore.searchRelevantMemories(userId, query, 3),
        this.vectorStore.searchUserMemories(userId, query, undefined, 2)
      ]);

      const formatted = this.formatMemoriesForContext(conversationMemories, userMemories);

      return {
        conversationMemories,
        userMemories,
        formatted
      };
    } catch (error) {
      console.error('Failed to get relevant memories:', error);
      return {
        conversationMemories: [],
        userMemories: [],
        formatted: ''
      };
    }
  }

  /**
   * Format memories for injection into conversation context
   */
  private formatMemoriesForContext(
    conversationMemories: any[],
    userMemories: ExtractedMemory[]
  ): string {
    let formatted = '';

    if (userMemories.length > 0) {
      formatted += '**User Context:**\n';
      
      const preferences = userMemories.filter(m => m.type === 'preference');
      const skills = userMemories.filter(m => m.type === 'skill');
      const facts = userMemories.filter(m => m.type === 'fact');
      
      if (preferences.length > 0) {
        formatted += `Preferences: ${preferences.map(p => p.content).join('; ')}\n`;
      }
      if (skills.length > 0) {
        formatted += `Skills: ${skills.map(s => s.content).join('; ')}\n`;
      }
      if (facts.length > 0) {
        formatted += `Background: ${facts.map(f => f.content).join('; ')}\n`;
      }
    }

    if (conversationMemories.length > 0) {
      formatted += '\n**Previous Context:**\n';
      formatted += conversationMemories
        .map(mem => `${mem.content.substring(0, 100)}...`)
        .join('\n');
    }

    return formatted.trim();
  }

  /**
   * Create a summary of a completed conversation
   */
  private async createConversationSummary(
    userId: string,
    conversation: ConversationContext
  ): Promise<ConversationSummary> {
    try {
      const messages = conversation.messages.slice(-10); // Summarize last 10 messages
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

      const prompt = `Summarize this conversation in 2-3 sentences, focusing on the main topics discussed and any decisions made:

${conversationText}

Summary:`;

      const response = await this.modelRouter.generateText({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 200,
      });

      const summary: ConversationSummary = {
        id: `summary-${conversation.id}`,
        userId,
        conversationId: conversation.id,
        summary: response.content.trim(),
        keyTopics: this.extractKeyTopics(conversationText),
        modelsUsed: [...new Set(messages.map(m => m.model).filter(Boolean))] as string[],
        totalTokens: conversation.metadata.tokenCount || 0,
        totalCost: 0, // Would need to calculate from usage
        createdAt: new Date(),
      };

      // TODO: Store summary in database
      console.log(`📝 Created summary for conversation ${conversation.id}`);
      
      return summary;
    } catch (error) {
      console.error('Failed to create conversation summary:', error);
      throw error;
    }
  }

  /**
   * Extract key topics from conversation text
   */
  private extractKeyTopics(conversationText: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
    
    const words = conversationText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string): Promise<{
    totalConversations: number;
    totalMemories: number;
    memoryBreakdown: Record<string, number>;
    lastActivity: Date | null;
  }> {
    try {
      const [storageStats, userMemories] = await Promise.all([
        this.vectorStore.getStorageStats(userId),
        this.vectorStore.searchUserMemories(userId, '', undefined, 100) // Get all memories
      ]);

      const memoryBreakdown = userMemories.reduce((acc: Record<string, number>, memory: ExtractedMemory) => {
        acc[memory.type] = (acc[memory.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const lastActivity = userMemories.length > 0 
        ? new Date(Math.max(...userMemories.map((m: ExtractedMemory) => m.timestamp.getTime())))
        : null;

      return {
        totalConversations: storageStats.conversationCount,
        totalMemories: storageStats.memoryCount,
        memoryBreakdown,
        lastActivity
      };
    } catch (error) {
      console.error('Failed to get memory stats:', error);
      return {
        totalConversations: 0,
        totalMemories: 0,
        memoryBreakdown: {},
        lastActivity: null
      };
    }
  }

  /**
   * Update user preferences based on interaction patterns
   */
  async updateUserPreferences(
    userId: string,
    preferences: Record<string, string>
  ): Promise<void> {
    const memories: ExtractedMemory[] = Object.entries(preferences).map(([key, value]) => ({
      type: 'preference',
      content: `${key}: ${value}`,
      confidence: 0.9, // High confidence for explicitly set preferences
      extractedFrom: 'user-settings',
      timestamp: new Date(),
    }));

    await this.vectorStore.storeMemories(userId, memories);
    console.log(`✅ Updated preferences for user ${userId}`);
  }

  /**
   * Clear all memory data for a user (GDPR compliance)
   */
  async clearUserMemories(userId: string): Promise<void> {
    try {
      await this.vectorStore.deleteUserData(userId);
      console.log(`🗑️ Cleared all memories for user ${userId}`);
    } catch (error) {
      console.error('Failed to clear user memories:', error);
      throw error;
    }
  }

  /**
   * Check if memory system is available
   */
  isAvailable(): boolean {
    return this.vectorStore.isInitialized();
  }
} 