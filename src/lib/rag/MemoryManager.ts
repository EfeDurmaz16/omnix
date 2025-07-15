import { EnhancedGCPVectorStore, ExtractedMemory } from './EnhancedGCPVectorStore';
import { AdvancedContextManager, ConversationContext, ContextMessage } from '../context/AdvancedContextManager';
import { getModelRouter } from '../model-router';
import { userService } from '../user/UserService';

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
    
    // Process both user and assistant messages for comprehensive memory extraction
    const allMessages = conversation.messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
    console.log(`🧠 Processing ${allMessages.length} messages for memory extraction`);
    
    for (const message of allMessages) {
      try {
        const extracted = await this.extractMemoryTypes(message.content, conversation.id);
        if (extracted.length > 0) {
          console.log(`✅ Extracted ${extracted.length} memories from ${message.role} message`);
          memories.push(...extracted);
        }
      } catch (error) {
        console.warn('Failed to extract memories from message:', message.id, error);
      }
    }
    
    // Also create a conversation summary as a topic memory
    try {
      const conversationSummary = await this.createConversationTopicSummary(conversation);
      if (conversationSummary) {
        memories.push({
          type: 'topic',
          content: conversationSummary,
          confidence: 0.8,
          extractedFrom: conversation.id,
          timestamp: new Date()
        });
        console.log(`✅ Created conversation summary memory: ${conversationSummary.substring(0, 100)}...`);
      }
    } catch (error) {
      console.warn('Failed to create conversation summary:', error);
    }
    
    console.log(`🧠 Total memories extracted: ${memories.length}`);
    return memories;
  }

  /**
   * Create a summary of the conversation as a topic memory
   */
  private async createConversationTopicSummary(conversation: ConversationContext): Promise<string | null> {
    try {
      const messages = conversation.messages.slice(-10); // Last 10 messages
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      const prompt = `Create a concise summary of this conversation that captures the main topics, concepts, and information discussed:

${conversationText}

Focus on:
- Main topics/subjects discussed
- Key concepts explained
- Problems solved
- Information shared
- Questions asked and answered

Summary (2-3 sentences):`;

      const response = await this.modelRouter.generateText({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 200,
      });

      const summary = response.content.trim();
      return summary.length > 10 ? summary : null;
    } catch (error) {
      console.error('Failed to create conversation topic summary:', error);
      return null;
    }
  }

  /**
   * Use AI to extract different types of memories from user input
   */
  private async extractMemoryTypes(content: string, conversationId: string): Promise<ExtractedMemory[]> {
    if (content.length < 10) {
      return []; // Skip very short messages
    }

    try {
      const prompt = `Analyze this user message and extract any important information for future conversations:

Message: "${content}"

Extract and categorize any:
1. Personal preferences (I like, I prefer, I hate, I enjoy, I dislike)
2. Skills/expertise (I work in, I'm experienced with, I know how to, I've worked on)
3. Personal facts (My name is, I live in, I am, I have, I work at)
4. Goals/objectives (I want to, I'm trying to, I plan to, I need to)
5. Topics discussed (talking about X, learning about Y, working on Z project)
6. Questions asked (asking about concepts, seeking help with problems)
7. Shared knowledge (user explained X, user knows about Y, user mentioned Z)

Return a JSON array of objects with this format:
[
  {
    "type": "preference|skill|fact|goal|topic|question|knowledge",
    "content": "extracted information",
    "confidence": 0.0-1.0
  }
]

Include both personal information AND general conversation topics/knowledge. Be comprehensive but accurate.`;

      const response = await this.modelRouter.generateText({
        model: 'gpt-4o-mini', // Cost-effective for extraction
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 500,
      });

      const extracted = this.parseMemoryExtraction(response.content, conversationId);
      
      // Filter out very low-confidence extractions (lowered threshold for better recall)
      return extracted.filter(memory => memory.confidence >= 0.4);
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
          ['preference', 'skill', 'fact', 'goal', 'topic', 'question', 'knowledge'].includes(item.type)
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
   * Extract chat ID from conversation ID for hierarchical memory search
   */
  private extractChatIdFromConversationId(conversationId: string): string {
    // Extract chat identifier from conversation ID
    // Format might be: "chat_123_session_456" -> "chat_123"
    const parts = conversationId.split('_');
    if (parts.length >= 2 && parts[0] === 'chat') {
      return `${parts[0]}_${parts[1]}`;
    }
    // Fallback: use first part or whole ID
    return parts[0] || conversationId;
  }

  /**
   * Get relevant memories for enhancing user context (OPTIMIZED)
   */
  async getRelevantMemoriesForContext(
    userId: string, 
    query: string,
    contextType: 'conversation' | 'preference' | 'skill' = 'conversation',
    currentConversationId?: string
  ): Promise<{ 
    conversationMemories: any[];
    userMemories: ExtractedMemory[];
    formatted: string;
  }> {
    const startTime = performance.now();
    
    try {
      console.log(`🔍 MemoryManager searching for user ${userId} with query: "${query.substring(0, 100)}"`);
      
      // Implement intelligent caching and reduce search scope
      const cacheKey = `${userId}-${query.substring(0, 50)}`;
      
      // For very short queries, skip expensive search
      if (query.length < 5) {
        console.log('⚡ Skipping memory search for very short query');
        return { conversationMemories: [], userMemories: [], formatted: '' };
      }

      // Search both conversation and user memories with configurable limits
      const userPlan = await userService.getUserPlan(userId);
      
      // Separate the non-blocking cleanup from the memory searches
      this.vectorStore.scheduleUserCleanup(userId, userPlan).catch(error => 
        console.warn('Background cleanup failed:', error)
      );
      
      console.log(`🔍 Starting memory search for user ${userId} with plan ${userPlan}`);
      
      // Extract current chat ID for hierarchical search
      const currentChatId = currentConversationId ? 
        this.extractChatIdFromConversationId(currentConversationId) : 
        undefined;
      
      console.log(`🔍 Hierarchical search with current chat: ${currentChatId || 'none'}`);
      
      const [conversationMemories, userMemories] = await Promise.all([
        this.vectorStore.searchRelevantMemories(userId, query, 5, userPlan, currentChatId), // Hierarchical search
        this.vectorStore.searchUserMemories(userId, query, undefined, 3), // User-specific memories
      ]);
      
      console.log(`🔍 Raw memory search results:`, {
        conversationCount: conversationMemories?.length || 0,
        userCount: userMemories?.length || 0,
        conversationSample: conversationMemories?.slice(0, 1),
        userSample: userMemories?.slice(0, 1)
      });
      
      // Enhanced debugging for user memories
      if (userMemories && userMemories.length > 0) {
        console.log(`✅ User memories found:`, userMemories.map(m => ({
          type: m.type,
          content: m.content.substring(0, 100) + '...',
          confidence: m.confidence,
          timestamp: m.timestamp
        })));
      } else {
        console.log(`⚠️ No user memories returned from vector store`);
      }

      const elapsedTime = performance.now() - startTime;
      console.log(`⏱️ Memory search completed in ${elapsedTime.toFixed(2)}ms`);
      console.log(`📊 Memory search results: ${conversationMemories.length} conversation memories, ${userMemories.length} user memories`);

      let formatted = this.formatMemoriesForContext(conversationMemories, userMemories);
      
      // If no memories found, try to get basic user profile information
      if (formatted.length === 0) {
        console.log('🔍 No specific memories found, searching for basic user profile');
        const profileMemories = await this.vectorStore.searchUserMemories(userId, 'user profile personal info', 'fact', 5);
        if (profileMemories.length > 0) {
          formatted = this.formatMemoriesForContext([], profileMemories);
          console.log('✅ Found basic user profile information as fallback');
        } else {
          console.log('⚠️ No user profile information found');
        }
      }
      
      // Enhance memory with profile fallback if we have memories but they're sparse
      if (formatted.length > 0 && formatted.length < 200) {
        console.log('🔍 Enhancing memory with profile fallback');
        const enhancedMemories = await this.vectorStore.searchUserMemories(userId, 'name age location education work', 'fact', 3);
        if (enhancedMemories.length > 0) {
          const enhancedFormatted = this.formatMemoriesForContext([], enhancedMemories);
          if (enhancedFormatted.length > 0) {
            formatted = enhancedFormatted + '\n\n' + formatted;
            console.log('✅ Enhanced memory with additional profile information');
          }
        }
      }
      
      console.log('🔍 Memory search result summary:', {
        conversationMemories: conversationMemories.length,
        userMemories: userMemories.length,
        formattedLength: formatted.length,
        hasContent: formatted.length > 0
      });
      
      if (formatted.length > 0) {
        console.log('📋 Formatted memory preview:', formatted.substring(0, 300) + '...');
      } else {
        console.log('⚠️ No relevant memories found or empty formatted response');
      }

      return {
        conversationMemories,
        userMemories,
        formatted
      };
    } catch (error) {
      const elapsedTime = performance.now() - startTime;
      console.error(`❌ Memory search failed after ${elapsedTime.toFixed(2)}ms:`, error);
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
    console.log('🔧 formatMemoriesForContext called with:', {
      conversationMemoriesCount: conversationMemories.length,
      userMemoriesCount: userMemories.length,
      conversationMemoriesSample: conversationMemories.slice(0, 2),
      userMemoriesSample: userMemories.slice(0, 2)
    });

    let formatted = '';

    if (userMemories.length > 0) {
      console.log('🔧 Processing user memories...');
      formatted += '# User Profile Information\n\n';
      
      const preferences = userMemories.filter(m => m.type === 'preference');
      const skills = userMemories.filter(m => m.type === 'skill');
      const facts = userMemories.filter(m => m.type === 'fact');
      const goals = userMemories.filter(m => m.type === 'goal');
      const topics = userMemories.filter(m => m.type === 'topic');
      const questions = userMemories.filter(m => m.type === 'question');
      const knowledge = userMemories.filter(m => m.type === 'knowledge');
      
      console.log('🔧 Memory breakdown:', {
        preferences: preferences.length,
        skills: skills.length,
        facts: facts.length,
        goals: goals.length,
        topics: topics.length,
        questions: questions.length,
        knowledge: knowledge.length
      });
      
      if (facts.length > 0) {
        console.log('🔧 Adding facts section:', facts.map(f => f.content));
        formatted += `**Personal Information:**\n${facts.map(f => `- ${f.content}`).join('\n')}\n\n`;
      }
      if (preferences.length > 0) {
        console.log('🔧 Adding preferences section:', preferences.map(p => p.content));
        formatted += `**User Preferences:**\n${preferences.map(p => `- ${p.content}`).join('\n')}\n\n`;
      }
      if (skills.length > 0) {
        console.log('🔧 Adding skills section:', skills.map(s => s.content));
        formatted += `**Skills & Expertise:**\n${skills.map(s => `- ${s.content}`).join('\n')}\n\n`;
      }
      if (goals.length > 0) {
        console.log('🔧 Adding goals section:', goals.map(g => g.content));
        formatted += `**Goals & Objectives:**\n${goals.map(g => `- ${g.content}`).join('\n')}\n\n`;
      }
      if (topics.length > 0) {
        console.log('🔧 Adding topics section:', topics.map(t => t.content));
        formatted += `**Topics Previously Discussed:**\n${topics.map(t => `- ${t.content}`).join('\n')}\n\n`;
      }
      if (questions.length > 0) {
        console.log('🔧 Adding questions section:', questions.map(q => q.content));
        formatted += `**Questions Previously Asked:**\n${questions.map(q => `- ${q.content}`).join('\n')}\n\n`;
      }
      if (knowledge.length > 0) {
        console.log('🔧 Adding knowledge section:', knowledge.map(k => k.content));
        formatted += `**Knowledge Shared:**\n${knowledge.map(k => `- ${k.content}`).join('\n')}\n\n`;
      }
    } else {
      console.log('⚠️ No user memories to format');
    }

    if (conversationMemories.length > 0) {
      console.log('🔧 Adding conversation memories section');
      formatted += '# Relevant Previous Conversations\n\n';
      formatted += conversationMemories
        .map((mem, idx) => `${idx + 1}. ${mem.content.substring(0, 200)}...`)
        .join('\n\n');
    } else {
      console.log('⚠️ No conversation memories to format');
    }

    const finalFormatted = formatted.trim();
    console.log('🔧 formatMemoriesForContext result:', {
      originalLength: formatted.length,
      trimmedLength: finalFormatted.length,
      isEmpty: finalFormatted === '',
      preview: finalFormatted.substring(0, 200) + '...'
    });

    return finalFormatted;
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
        this.vectorStore.searchUserMemories(userId, 'user preferences and background', undefined, 100) // Get all memories
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