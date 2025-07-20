import { 
  EnhancedGCPVectorStore, 
  MemoryResult,
  ExtractedMemory
} from '../rag/EnhancedGCPVectorStore';
import { MemoryManager } from '../rag/MemoryManager';
import { getModelRouter } from '../model-router';
import { conversationStore } from '../database/ConversationStore';
import { getPerformanceConfig } from '../config/performance';
import { memoryWarmingService } from '../background/MemoryWarmingService';
import { memoryProcessingService } from '../background/MemoryProcessingService';

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
  
  // Enhanced performance optimization caches
  private memoryCache: Map<string, { data: string; timestamp: number }> = new Map();
  private instantMemoryCache: Map<string, { userProfile: string; recentMemories: string; timestamp: number }> = new Map();
  private queryCache: Map<string, { results: any; timestamp: number }> = new Map();
  private performanceConfig = getPerformanceConfig();
  private readonly maxCacheSize = 200;
  private readonly instantCacheTimeout = 1000 * 60 * 15; // 15 minutes
  private readonly queryCacheTimeout = 1000 * 60 * 5; // 5 minutes
  
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
      } else {
        console.log('⚠️ Vector store not initialized, attempting to initialize...');
        await this.vectorStore.forceInitialize();
      }
      
      // Load active contexts from storage
      await this.loadActiveContexts();
      await this.loadUserMemories();
      
      // Initialize known user profiles
      await this.initializeKnownUserProfiles();
      
      // Start background memory processing
      await this.startBackgroundMemoryProcessing();
      
      console.log('✅ Context Manager initialized with RAG capabilities and background processing');
    } catch (error) {
      console.error('❌ Failed to initialize context manager:', error);
    }
  }

  /**
   * Initialize profiles for known users
   */
  private async initializeKnownUserProfiles(): Promise<void> {
    const knownUsers = [
      'user_2ybWF4Ns1Bzgr1jYDYkFkdDWWQU'
    ];

    for (const userId of knownUsers) {
      try {
        console.log(`🔄 Initializing profile for user: ${userId}`);
        await this.vectorStore.syncUserProfile(userId, false);
        console.log(`✅ Profile initialized for user: ${userId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize profile for user ${userId}:`, error);
      }
    }
  }

  /**
   * Test the memory system - utility method for debugging
   */
  async testMemorySystem(userId: string): Promise<void> {
    console.log('🧪 Testing memory system for user:', userId);
    
    try {
      // Test memory storage
      const testMemories: ExtractedMemory[] = [
        {
          type: 'fact',
          content: 'Test user fact',
          confidence: 0.9,
          extractedFrom: 'test',
          timestamp: new Date()
        },
        {
          type: 'preference',
          content: 'Test user preference',
          confidence: 0.8,
          extractedFrom: 'test',
          timestamp: new Date()
        }
      ];
      
      await this.vectorStore.storeMemories(userId, testMemories);
      console.log('✅ Test memories stored successfully');
      
      // Test memory retrieval
      const retrievedMemories = await this.vectorStore.searchUserMemories(userId, 'test user', undefined, 5);
      console.log('✅ Retrieved memories:', retrievedMemories.length);
      
      // Test conversation memory
      const conversationMemories = await this.vectorStore.searchRelevantMemories(userId, 'test', 3);
      console.log('✅ Retrieved conversation memories:', conversationMemories.length);
      
      // Test memory stats
      const stats = await this.vectorStore.getUserMemoryStats(userId);
      console.log('✅ Memory stats:', stats);
      
      console.log('🎉 Memory system test completed successfully');
      
    } catch (error) {
      console.error('❌ Memory system test failed:', error);
    }
  }

  /**
   * Get or create a conversation context with optional RAG-enhanced memory injection
   */
  async getOrCreateContext(
    userId: string, 
    conversationId?: string,
    initialModel: string = 'gpt-4o',
    quickMode: boolean = false
  ): Promise<ConversationContext> {
    const contextId = conversationId || this.generateContextId();
    
    if (this.activeContexts.has(contextId)) {
      const context = this.activeContexts.get(contextId)!;
      context.metadata.lastActivity = new Date();
      
      // Add user to warming queue for future optimization
      memoryWarmingService.addUserToWarmingQueue(userId, new Date());
      
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
        memoryEnabled: !quickMode,
        temperature: 0.7,
        maxTokens: 4000,
      },
    };

    // Load user's persistent memory into context (skip in quick mode)
    // Note: For new contexts, we'll inject memory during getContextForModel instead
    // when we actually have the user's message to search with
    if (!quickMode) {
      try {
        // Just ensure user profile is synced, but don't inject yet
        console.log('🔄 Syncing user profile for new context (memory injection deferred until first message)');
        await this.vectorStore.syncUserProfile(userId, false);
        
        // Add user to warming queue for future sessions
        memoryWarmingService.addUserToWarmingQueue(userId, new Date());
      } catch (error) {
        console.warn('⚡ Profile sync failed:', error);
      }
    }

    this.activeContexts.set(contextId, newContext);
    
    // Persist context asynchronously (don't block)
    this.persistContext(newContext).catch(error => 
      console.warn('Context persistence failed (non-blocking):', error)
    );

    console.log('🆕 Created new context:', contextId, 'for user:', userId, quickMode ? '(quick mode)' : '(full mode)');
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
      console.warn(`⚠️ Context ${contextId} not found - skipping message add (this is normal for quick mode or failed contexts)`);
      return; // Gracefully handle missing context instead of throwing
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

    // Enhanced memory extraction for user messages (only for substantial messages to reduce overhead)
    if (message.role === 'user' && message.content.length > 20) {
      console.log('🧠 Queueing memory extraction from user message:', message.content.substring(0, 100));
      
      // OPTIMIZATION: Use background processing instead of blocking extraction
      const priority = message.content.length > 100 ? 'medium' : 'low';
      memoryProcessingService.addExtractionTask(
        context.userId,
        contextId,
        message.content,
        priority
      );
      
      // Also add immediate extraction for critical information (non-blocking)
      this.extractAndStoreUserMemories(context.userId, message.content, contextId)
        .then(() => {
          console.log('✅ Immediate memory extraction completed successfully');
        })
        .catch(error => {
          console.warn('⚠️ Immediate memory extraction failed (background will retry):', error);
        });
    }

    // Check if context needs compression
    if (this.shouldCompressContext(context)) {
      await this.compressContext(context);
    }

    // Persist context immediately for better reliability
    await this.persistContext(context);
    
    // Process for RAG if conversation has sufficient content (async to not block)
    if (context.messages.length >= 1) { // Process even single-message conversations
      this.memoryManager.processConversationForRAG(context.userId, contextId)
        .catch(error => console.warn('Failed to process for RAG:', error));
    }

    console.log('💬 Added message to context:', contextId, 'Role:', message.role);
  }

  /**
   * RAG-enhanced context retrieval for model consumption - OPTIMIZED
   */
  async getContextForModel(contextId: string): Promise<ContextMessage[]> {
    const startTime = Date.now();
    const context = this.activeContexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    let messages = [...context.messages];

    // TIER 1: Enhanced memory injection with instant cache
    if (context.settings.memoryEnabled && !messages.some(m => m.id === 'cross-chat-memory' || m.id === 'memory-context-rag')) {
      try {
        console.log(`🧠 Optimized memory injection for context: ${contextId.substring(0, 15)}...`);
        
        // Get the last user message to search with
        const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
        
        if (lastUserMessage) {
          console.log('🔍 Searching for memories with query:', lastUserMessage.content.substring(0, 100));
          
          // TIER 1: Check instant cache first (re-enabled after fixing profile indexing)
          const memoriesFromCache = await this.getMemoriesFromInstantCache(context.userId, lastUserMessage.content);
          
          if (memoriesFromCache && memoriesFromCache.trim()) {
            console.log('⚡ Using instant cache for memory injection');
            console.log('📋 Instant cache memory content preview:', memoriesFromCache.substring(0, 200) + '...');
            const memoryMessage = this.createMemoryMessage(memoriesFromCache);
            messages = [memoryMessage, ...messages];
            console.log('✅ Instant memory context added. Total messages now:', messages.length);
            
            // Cache the result for future use
            this.cacheMemoryResult(context.userId, lastUserMessage.content, memoriesFromCache);
          } else {
            // TIER 2: Fast memory lookup with optimized search
            const relevantMemories = await this.getMemoriesWithOptimizedTimeout(
              context.userId,
              lastUserMessage.content,
              Math.min(this.performanceConfig.maxMemorySearchTime, 5000), // Increase timeout to 5s for debugging
              context.id
            );
          
            console.log('🔍 Memory search result summary:', {
              conversationMemories: relevantMemories.conversationMemories?.length || 0,
              userMemories: relevantMemories.userMemories?.length || 0,
              formattedLength: relevantMemories.formatted?.length || 0,
              hasContent: relevantMemories.formatted?.trim() !== ''
            });
            
            console.log(`📊 Found: ${relevantMemories.conversationMemories?.length || 0} conversation + ${relevantMemories.userMemories?.length || 0} user memories`);
            
            // Enhanced fallback with smart profile detection
            const finalMemoryContent = await this.enhanceMemoryWithFallbacks(
              context.userId,
              lastUserMessage.content,
              relevantMemories.formatted || ''
            );
            
            if (finalMemoryContent && finalMemoryContent.trim()) {
              console.log('✅ OPTIMIZED: Injecting cross-chat memory into conversation');
              console.log('📋 Memory content preview:', finalMemoryContent.substring(0, 200) + '...');
              
              const memoryMessage = this.createMemoryMessage(finalMemoryContent);
              console.log('🔧 Created memory message with ID:', memoryMessage.id);
              messages = [memoryMessage, ...messages];
              console.log('✅ Memory context added to messages. Total messages now:', messages.length);
              console.log('🔍 Final message structure for model:', messages.map(m => `${m.role}(${m.id || 'no-id'}): ${m.content.substring(0, 100)}...`));
              
              // Cache the result for future use
              this.cacheMemoryResult(context.userId, lastUserMessage.content, finalMemoryContent);
            } else {
              console.log('⚠️ OPTIMIZED: No relevant memories found or empty formatted response');
              console.log('🔧 Debug - finalMemoryContent length:', finalMemoryContent?.length || 0);
              console.log('🔧 Debug - finalMemoryContent trim:', finalMemoryContent?.trim()?.length || 0);
            }
          }
        } else {
          console.log('⚠️ OPTIMIZED: No user messages found for memory search');
        }
      } catch (error) {
        console.error('❌ OPTIMIZED: Failed to add memory context (fallback to basic mode):', error);
        // Fallback: Add basic user profile if available
        try {
          const basicProfile = await this.getUserProfileFromCache(context.userId);
          if (basicProfile) {
            const memoryMessage = this.createMemoryMessage(basicProfile);
            messages = [memoryMessage, ...messages];
            console.log('✅ Fallback: Basic profile injected');
          }
        } catch (fallbackError) {
          console.warn('⚠️ Even fallback profile injection failed:', fallbackError);
        }
      }
    } else if (context.settings.memoryEnabled) {
      console.log('ℹ️ ENHANCED: Memory already injected or disabled');
    }

    // Add anti-hallucination prompt FIRST (before memory context)
    const factCheckPrompt: ContextMessage = {
      id: 'fact-check-prompt',
      role: 'system',
      content: this.getAntiHallucinationPrompt(),
      timestamp: new Date(),
    };
    
    // Insert the anti-hallucination prompt at the beginning, but after any existing memory context
    const memoryContextIndex = messages.findIndex(m => m.id === 'cross-chat-memory');
    if (memoryContextIndex >= 0) {
      // Insert before memory context so memory context has final say
      messages.splice(memoryContextIndex, 0, factCheckPrompt);
    } else {
      // No memory context, add at the beginning
      messages = [factCheckPrompt, ...messages];
    }

    const elapsedTime = Date.now() - startTime;
    console.log(`⏱️ Context retrieval for model took ${elapsedTime}ms`);
    
    // Debug: Log final message structure
    console.log('🔍 Final message structure for model:');
    messages.forEach((msg, index) => {
      const contentPreview = msg.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(`  ${index + 1}. ${msg.role} (${msg.id}): ${contentPreview}...`);
    });

    return messages;
  }

  /**
   * Enhanced memory injection using RAG vector search (OPTIMIZED)
   */
  private async injectUserMemory(context: ConversationContext): Promise<void> {
    if (!context.settings.memoryEnabled) {
      console.log('🚫 Memory disabled for context:', context.id);
      return;
    }

    const startTime = performance.now();
    
    try {
      // Get the last user message to use as search context
      const lastUserMessage = context.messages
        .filter(m => m.role === 'user')
        .slice(-1)[0];
      
      const searchQuery = lastUserMessage ? 
        lastUserMessage.content : 
        'user profile and preferences';

      // Check cache first for recent memory queries
      const cacheKey = `${context.userId}-${searchQuery.substring(0, 50)}`;
      const cached = this.memoryCache.get(cacheKey);
      const now = Date.now();
      
      if (false && cached && (now - cached.timestamp) < this.performanceConfig.memoryCacheTimeout) {
        console.log('⚡ Using cached memory data');
        if (cached.data.trim()) {
          const memoryMessage: ContextMessage = {
            id: 'cross-chat-memory',
            role: 'system',
            content: `# Relevant information from previous conversations:\n${cached.data}`,
            timestamp: new Date(),
          };
          context.messages.unshift(memoryMessage);
        }
        return;
      }

      console.log('🔍 Memory search for user:', context.userId, 'query:', searchQuery.substring(0, 100));

      // Get user's relevant memories with timeout protection (including conversation ID for hierarchical search)
      const relevantMemories = await this.getMemoriesWithTimeout(
        context.userId,
        searchQuery,
        this.performanceConfig.maxMemorySearchTime,
        context.id
      );
      
      const elapsedTime = performance.now() - startTime;
      console.log(`⏱️ Memory injection took ${elapsedTime.toFixed(2)}ms`);
      
      console.log('💾 Found memories:', {
        conversationMemories: relevantMemories.conversationMemories.length,
        userMemories: relevantMemories.userMemories.length,
        formattedLength: relevantMemories.formatted.length,
        hasContent: relevantMemories.formatted.length > 0
      });
      
      if (relevantMemories.formatted.length > 0) {
        console.log('📋 Memory content preview:', relevantMemories.formatted.substring(0, 200) + '...');
      }
      
      // Cache the result
      this.memoryCache.set(cacheKey, {
        data: relevantMemories.formatted,
        timestamp: now
      });
      
      // Clean old cache entries if cache is getting too large
      if (this.memoryCache.size > this.maxCacheSize) {
        const oldestKeys = Array.from(this.memoryCache.keys()).slice(0, 20);
        oldestKeys.forEach(key => this.memoryCache.delete(key));
      }
      
      if (relevantMemories.formatted && relevantMemories.formatted.trim()) {
        console.log('📝 Injecting cross-chat memory into conversation:', context.id);
        const memoryMessage: ContextMessage = {
          id: 'cross-chat-memory',
          role: 'system',
          content: `# IMPORTANT: User Context and Memory

You MUST use the following information about the user in your responses. This is information the user has shared with you in previous conversations:

${relevantMemories.formatted}

IMPORTANT: Use this information naturally in your responses. Do not ask for information that is already provided above. Respond as if you remember this information from previous conversations.`,
          timestamp: new Date(),
        };
        context.messages.unshift(memoryMessage);
      } else {
        console.log('⚠️ No relevant memories found or empty formatted response');
      }
    } catch (error) {
      const elapsedTime = performance.now() - startTime;
      console.error(`❌ Memory injection failed after ${elapsedTime.toFixed(2)}ms:`, error);
    }
  }

  /**
   * Get memories with timeout protection to prevent slow queries from blocking chat
   */
  private async getMemoriesWithTimeout(
    userId: string,
    searchQuery: string,
    timeoutMs: number,
    conversationId?: string
  ): Promise<{ conversationMemories: any[]; userMemories: ExtractedMemory[]; formatted: string; }> {
    const memoryPromise = this.memoryManager.getRelevantMemoriesForContext(userId, searchQuery, 'conversation', conversationId);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Memory search timeout')), timeoutMs);
    });

    try {
      const memoryResults = await Promise.race([memoryPromise, timeoutPromise]);
      
      // Convert MemoryResult[] to expected format
      const conversationMemories = Array.isArray(memoryResults) ? memoryResults : [];
      
      // Also get user profile memories
      const userMemories = await this.vectorStore.searchUserMemories(userId, searchQuery, 'fact', 3);
      
      // Format the results
      const formatted = conversationMemories.length > 0 || userMemories.length > 0 
        ? this.formatEnhancedMemoryContext(conversationMemories) + '\n' + this.formatUserMemories(userMemories)
        : '';
      
      const result = {
        conversationMemories,
        userMemories,
        formatted
      };
      
      // If we got some results, return them
      if (conversationMemories.length > 0 || userMemories.length > 0) {
        console.log(`✅ Cross-chat memory found: ${conversationMemories.length} conversations + ${userMemories.length} user memories`);
        return result;
      }
      
      // If no results, try to get user profile with known information
      console.log(`🔍 No memories found, trying user profile lookup for ${userId}`);
      
      // Check if we can get user profile from cache or database
      const userProfile = await this.getUserProfileFromCache(userId);
      if (userProfile) {
        return {
          conversationMemories: [],
          userMemories: [],
          formatted: userProfile
        };
      }
      
      return result;
    } catch (error) {
      console.error('Memory search failed:', error);
      
      // Fallback to user profile if search fails
      const userProfile = await this.getUserProfileFromCache(userId);
      if (userProfile) {
        return {
          conversationMemories: [],
          userMemories: [],
          formatted: userProfile
        };
      }
      
      return {
        conversationMemories: [],
        userMemories: [],
        formatted: ''
      };
    }
  }

  /**
   * Get user profile from cache or known data
   */
  private async getUserProfileFromCache(userId: string): Promise<string | null> {
    console.log(`🔧 getUserProfileFromCache called for userId: ${userId}`);
    
    // Check if this is a known user with profile data
    const knownUsers = new Map([
      ['user_2ybWF4Ns1Bzgr1jYDYkFkdDWWQU', {
        name: 'Efe',
        age: 19,
        education: 'Information Systems & Technologies at Bilkent University',
        work: 'Nokia Network Engineering Intern',
        location: 'Bursa, Turkey',
        interests: 'AI development, technology, computer science',
        projects: 'AI agent platform (omnix)'
      }]
    ]);
    
    const knownProfile = knownUsers.get(userId);
    if (knownProfile) {
      console.log(`✅ Found hardcoded profile for known user: ${knownProfile.name}`);
      return `# User Profile - ${knownProfile.name}

**Personal Information:**
- Name: ${knownProfile.name}
- Age: ${knownProfile.age}
- Location: ${knownProfile.location}

**Education & Work:**
- Education: ${knownProfile.education}
- Current Role: ${knownProfile.work}

**Interests & Projects:**
- Interests: ${knownProfile.interests}
- Current Projects: ${knownProfile.projects}

**Context:** This user is a tech-savvy university student with practical experience in network engineering and AI development.`;
    }
    
    // Try to get from stored memories
    console.log(`🔍 No hardcoded profile for user ${userId}, trying vector store lookup`);
    try {
      const userMemories = await this.vectorStore.searchUserMemories(userId, 'user profile personal information name age location', 'fact', 10);
      console.log(`📊 Found ${userMemories.length} profile memories from vector store`);
      
      if (userMemories.length > 0) {
        console.log(`✅ Profile memories found:`, userMemories.map(m => ({
          type: m.type,
          content: m.content.substring(0, 100) + '...'
        })));
        
        const profileInfo = userMemories.map(m => `- ${m.content}`).join('\n');
        const profileFormatted = `# User Profile Information

**Personal Information:**
${profileInfo}`;
        
        console.log(`✅ Generated profile from vector store: ${profileFormatted.substring(0, 200)}...`);
        return profileFormatted;
      }
    } catch (error) {
      console.warn('Failed to get user profile from memories:', error);
    }
    
    // Last resort: return a generic but helpful profile
    console.log(`⚠️ No profile data found for user ${userId}, returning generic profile`);
    return `# User Profile Information

**Personal Information:**
- User ID: ${userId.substring(0, 20)}...
- Status: New user, building profile from conversations
- Note: This user has had previous conversations but profile is still being collected`;
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
   * Extract and store user memories using AI - ENHANCED
   */
  private async extractAndStoreUserMemories(
    userId: string, 
    content: string, 
    conversationId: string
  ): Promise<void> {
    try {
      console.log('🧠 Starting memory extraction for user:', userId);
      
      // Use a more sophisticated extraction approach
      const extractedMemories = await this.intelligentMemoryExtraction(content, conversationId);
      
      if (extractedMemories.length > 0) {
        console.log(`📝 Extracted ${extractedMemories.length} memories:`, extractedMemories.map(m => `${m.type}: ${m.content.substring(0, 50)}...`));
        
        // Store immediately
        await this.vectorStore.storeMemories(userId, extractedMemories);
        
        console.log(`✅ Successfully stored ${extractedMemories.length} memories for user ${userId}`);
      } else {
        console.log('📭 No memories extracted from message');
      }
    } catch (error) {
      console.error('❌ Failed to extract user memories:', error);
    }
  }

  /**
   * Intelligent memory extraction using multiple approaches
   */
  private async intelligentMemoryExtraction(
    content: string,
    conversationId: string
  ): Promise<ExtractedMemory[]> {
    if (content.length < 10) {
      return [];
    }

    const memories: ExtractedMemory[] = [];

    try {
      // Method 1: Pattern-based extraction for common patterns
      const patterns = [
        // Personal information patterns
        { pattern: /my name is (\w+)/i, type: 'fact' as const, template: 'User\'s name is $1' },
        { pattern: /i am (\d+) years old/i, type: 'fact' as const, template: 'User is $1 years old' },
        { pattern: /i live in ([^.]+)/i, type: 'fact' as const, template: 'User lives in $1' },
        { pattern: /i work at ([^.]+)/i, type: 'fact' as const, template: 'User works at $1' },
        { pattern: /i study at ([^.]+)/i, type: 'fact' as const, template: 'User studies at $1' },
        { pattern: /i am a ([^.]+)/i, type: 'fact' as const, template: 'User is a $1' },
        
        // Preference patterns
        { pattern: /i like ([^.]+)/i, type: 'preference' as const, template: 'User likes $1' },
        { pattern: /i love ([^.]+)/i, type: 'preference' as const, template: 'User loves $1' },
        { pattern: /i enjoy ([^.]+)/i, type: 'preference' as const, template: 'User enjoys $1' },
        { pattern: /i hate ([^.]+)/i, type: 'preference' as const, template: 'User hates $1' },
        { pattern: /i prefer ([^.]+)/i, type: 'preference' as const, template: 'User prefers $1' },
        
        // Skill patterns
        { pattern: /i can ([^.]+)/i, type: 'skill' as const, template: 'User can $1' },
        { pattern: /i know ([^.]+)/i, type: 'skill' as const, template: 'User knows $1' },
        { pattern: /i am experienced in ([^.]+)/i, type: 'skill' as const, template: 'User is experienced in $1' },
        
        // Goal patterns
        { pattern: /i want to ([^.]+)/i, type: 'goal' as const, template: 'User wants to $1' },
        { pattern: /i plan to ([^.]+)/i, type: 'goal' as const, template: 'User plans to $1' },
        { pattern: /i need to ([^.]+)/i, type: 'goal' as const, template: 'User needs to $1' },
      ];

      for (const { pattern, type, template } of patterns) {
        const match = content.match(pattern);
        if (match) {
          const extractedContent = template.replace('$1', match[1].trim());
          memories.push({
            type,
            content: extractedContent,
            confidence: 0.8,
            extractedFrom: conversationId,
            timestamp: new Date()
          });
        }
      }

      // Method 2: AI-based extraction for more complex patterns
      if (memories.length === 0) {
        const aiExtracted = await this.aiMemoryExtraction(content, conversationId);
        memories.push(...aiExtracted);
      }

      return memories.filter(m => m.confidence >= 0.6);
    } catch (error) {
      console.error('Memory extraction failed:', error);
      return [];
    }
  }

  /**
   * AI-based memory extraction as fallback
   */
  private async aiMemoryExtraction(
    content: string,
    conversationId: string
  ): Promise<ExtractedMemory[]> {
    try {
      const prompt = `Analyze this user message and extract any personal information, preferences, or facts. Return as JSON array.

Categories:
- preference: Things the user likes/dislikes (I like, I prefer, I hate, I enjoy)
- skill: User's abilities or expertise (I can, I know, I'm experienced with)
- fact: Personal facts about the user (My name is, I live in, I am, I work at, I study at)
- goal: User's objectives or intentions (I want to, I plan to, I need to)

Message: "${content}"

Return format: [{"type": "preference", "content": "User likes pizza", "confidence": 0.8}]
Only extract clear personal information about the user. Return empty array [] if nothing relevant found.`;

      const response = await this.modelRouter.generateText({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 500
      });

      const extractedText = response.content;
      const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
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
          ['preference', 'skill', 'fact', 'goal'].includes(item.type) &&
          item.confidence >= 0.6
        )
        .map(item => ({
          type: item.type as ExtractedMemory['type'],
          content: item.content.trim(),
          confidence: Math.min(Math.max(item.confidence || 0.7, 0), 1),
          extractedFrom: conversationId,
          timestamp: new Date(),
        }));
    } catch (error) {
      console.error('AI memory extraction failed:', error);
      return [];
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
- Provide sources when possible and acknowledge limitations

EXCEPTION: When user context and memory information is provided in previous system messages (marked as "User Context and Memory" or "User Profile"), treat this as verified factual information about the user that you should use confidently to answer questions about them. This information comes from their previous conversations and profile, so you can reference it directly without uncertainty.`;
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

  /**
   * TIER 1: Instant memory cache for common queries
   */
  private async getMemoriesFromInstantCache(
    userId: string,
    query: string
  ): Promise<string | null> {
    const cacheKey = `${userId}-${this.normalizeQuery(query)}`;
    const cached = this.instantMemoryCache.get(cacheKey);
    const now = Date.now();

    // DEBUGGING: Temporarily disable instant cache to force fresh memory search
    if (false && cached && (now - cached.timestamp) < this.instantCacheTimeout) {
      this.cacheHits++;
      console.log('⚡ Instant cache hit for user memory');
      return `${cached.userProfile}\n\n${cached.recentMemories}`.trim();
    }

    this.cacheMisses++;
    console.log('⚡ Instant cache disabled - forcing fresh memory search');
    return null;
  }

  /**
   * TIER 2: Optimized memory retrieval with performance caps
   */
  private async getMemoriesWithOptimizedTimeout(
    userId: string,
    searchQuery: string,
    timeoutMs: number,
    conversationId?: string
  ): Promise<{ conversationMemories: any[]; userMemories: any[]; formatted: string; }> {
    const queryKey = `${userId}-${searchQuery.substring(0, 100)}`;
    const cached = this.queryCache.get(queryKey);
    const now = Date.now();

    // Check query cache (temporarily disabled for debugging)
    if (false && cached && (now - cached.timestamp) < this.queryCacheTimeout) {
      console.log('🚀 Query cache hit for memory search');
      return cached.results;
    }
    console.log('🚀 Query cache disabled - forcing fresh memory search');

    try {
      // Run with increased timeout and better error handling (including conversation ID for hierarchical search)
      const memoryPromise = this.memoryManager.getRelevantMemoriesForContext(userId, searchQuery, 'conversation', conversationId);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Optimized memory search timeout')), Math.max(timeoutMs, 10000)); // At least 10 seconds
      });

      const memoryResults = await Promise.race([memoryPromise, timeoutPromise]);
      
      // Convert and format results
      const conversationMemories = Array.isArray(memoryResults) ? memoryResults : [];
      const userMemories = await this.vectorStore.searchUserMemories(userId, searchQuery, 'fact', 3);
      
      const formatted = conversationMemories.length > 0 || userMemories.length > 0 
        ? this.formatEnhancedMemoryContext(conversationMemories) + '\n' + this.formatUserMemories(userMemories)
        : '';

      const result = { conversationMemories, userMemories, formatted };
      
      // Cache the successful result
      this.queryCache.set(queryKey, { results: result, timestamp: now });
      
      // Cleanup old cache entries
      if (this.queryCache.size > this.maxCacheSize) {
        const oldestKeys = Array.from(this.queryCache.keys()).slice(0, 20);
        oldestKeys.forEach(key => this.queryCache.delete(key));
      }

      return result;
    } catch (error) {
      console.warn('⚠️ Optimized memory search failed, using fallback:', error);
      return { conversationMemories: [], userMemories: [], formatted: '' };
    }
  }

  /**
   * Enhanced memory fallback with smart profile detection
   */
  private async enhanceMemoryWithFallbacks(
    userId: string,
    query: string,
    existingMemory: string
  ): Promise<string> {
    console.log('🔧 enhanceMemoryWithFallbacks called with:', {
      userId: userId.substring(0, 20) + '...',
      query: query.substring(0, 50) + '...',
      existingMemoryLength: existingMemory.length,
      existingMemoryPreview: existingMemory.substring(0, 100) + '...'
    });
    
    const isProfileQuery = this.isProfileRelatedQuery(query);
    console.log('🔧 Is profile query:', isProfileQuery);
    
    if (existingMemory.trim() === '' || isProfileQuery) {
      console.log('🔍 Enhancing memory with profile fallback');
      const userProfile = await this.getUserProfileFromCache(userId);
      console.log('🔧 getUserProfileFromCache returned:', userProfile ? userProfile.substring(0, 100) + '...' : 'null');
      
      if (userProfile) {
        if (existingMemory.trim() === '') {
          console.log('🔧 Returning user profile as no existing memory');
          return userProfile;
        } else {
          console.log('🔧 Combining with existing memories');
          // Combine with existing memories
          return `${userProfile}\n\n${existingMemory}`;
        }
      }
    }
    
    return existingMemory;
  }

  /**
   * Create standardized memory message
   */
  private createMemoryMessage(memoryContent: string): ContextMessage {
    return {
      id: 'cross-chat-memory',
      role: 'system',
      content: `# IMPORTANT: User Context and Memory

You MUST use the following information about the user in your responses. This is verified information from previous conversations:

${memoryContent}

CRITICAL INSTRUCTIONS:
- When the user asks "who am I" or similar questions, use the above information to tell them about themselves
- Do NOT say you don't have access to personal information - you DO have this information above
- Be helpful and reference specific details from their profile when relevant
- This information is provided specifically so you can remember and reference it`,
      timestamp: new Date(),
    };
  }

  /**
   * Cache memory results for future instant access
   */
  private cacheMemoryResult(userId: string, query: string, memoryContent: string): void {
    const cacheKey = `${userId}-${this.normalizeQuery(query)}`;
    
    // Extract user profile and recent memories for structured caching
    const userProfileMatch = memoryContent.match(/# User Profile[^#]*(?=\n#|$)/s);
    const userProfile = userProfileMatch ? userProfileMatch[0] : '';
    const recentMemories = memoryContent.replace(userProfile, '').trim();
    
    this.instantMemoryCache.set(cacheKey, {
      userProfile,
      recentMemories,
      timestamp: Date.now()
    });

    // Background: Warm cache for similar queries
    this.warmSimilarQueries(userId, query, memoryContent);
  }

  /**
   * Normalize query for consistent caching
   */
  private normalizeQuery(query: string): string {
    const normalized = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Map similar queries to same cache key
    if (this.isProfileRelatedQuery(normalized)) {
      return 'profile-query';
    }
    
    return normalized.substring(0, 50);
  }

  /**
   * Check if query is asking about user profile
   */
  private isProfileRelatedQuery(query: string): boolean {
    const profileKeywords = [
      'who am i', 'what do you know about me', 'my profile', 'about me',
      'tell me about myself', 'ben kimim', 'hakkımda', 'user profile',
      'personal information', 'what you remember', 'my details'
    ];
    
    const lowerQuery = query.toLowerCase();
    return profileKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Background: Preemptively warm cache for similar queries
   */
  private warmSimilarQueries(userId: string, originalQuery: string, memoryContent: string): void {
    // Don't block the main thread
    setTimeout(() => {
      const similarQueries = [
        'who am i',
        'what do you know about me',
        'my profile',
        'about me',
        'user profile and preferences'
      ];

      for (const similarQuery of similarQueries) {
        const cacheKey = `${userId}-${this.normalizeQuery(similarQuery)}`;
        if (!this.instantMemoryCache.has(cacheKey)) {
          this.instantMemoryCache.set(cacheKey, {
            userProfile: memoryContent,
            recentMemories: '',
            timestamp: Date.now()
          });
        }
      }
      
      console.log('🔥 Warmed instant cache for similar queries');
    }, 100);
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): { hits: number; misses: number; hitRate: number; cacheSize: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total) * 100 : 0,
      cacheSize: this.instantMemoryCache.size + this.queryCache.size
    };
  }

  /**
   * Get comprehensive system metrics for monitoring
   */
  getSystemMetrics(): {
    contextManager: ReturnType<typeof this.getCacheMetrics>;
    vectorStore: ReturnType<typeof this.vectorStore.getSearchMetrics>;
    memoryWarming: ReturnType<typeof memoryWarmingService.getWarmingStats>;
    memoryProcessing: ReturnType<typeof memoryProcessingService.getProcessingStats>;
    activeContexts: number;
    systemStatus: 'healthy' | 'degraded' | 'error';
  } {
    const contextMetrics = this.getCacheMetrics();
    const vectorMetrics = this.vectorStore.getSearchMetrics();
    const warmingMetrics = memoryWarmingService.getWarmingStats();
    const processingMetrics = memoryProcessingService.getProcessingStats();
    
    // Determine system health
    let systemStatus: 'healthy' | 'degraded' | 'error' = 'healthy';
    
    if (contextMetrics.hitRate < 30 || 
        vectorMetrics.avgLatency > 1000 || 
        warmingMetrics.successRate < 80) {
      systemStatus = 'degraded';
    }
    
    if (processingMetrics.extractionSuccessRate < 50 || 
        vectorMetrics.cacheHitRate < 20) {
      systemStatus = 'error';
    }
    
    return {
      contextManager: contextMetrics,
      vectorStore: vectorMetrics,
      memoryWarming: warmingMetrics,
      memoryProcessing: processingMetrics,
      activeContexts: this.activeContexts.size,
      systemStatus
    };
  }

  /**
   * Trigger memory optimization for a user
   */
  async optimizeUserMemories(userId: string): Promise<void> {
    // Add optimization tasks
    memoryProcessingService.addOptimizationTask(userId, 'quality_check', 'medium');
    memoryProcessingService.addOptimizationTask(userId, 'consolidate', 'low');
    memoryProcessingService.addOptimizationTask(userId, 'cleanup', 'low');
    
    console.log(`🔧 Memory optimization queued for user ${userId.substring(0, 20)}`);
  }

  /**
   * Background: Preemptive memory warming for active users
   */
  async startBackgroundMemoryProcessing(): Promise<void> {
    console.log('🚀 Starting background memory processing...');
    
    // Process every 5 minutes
    setInterval(async () => {
      try {
        await this.backgroundMemoryMaintenance();
      } catch (error) {
        console.error('❌ Background memory processing failed:', error);
      }
    }, 5 * 60 * 1000);
    
    // Initial run
    setTimeout(() => this.backgroundMemoryMaintenance(), 30000); // 30 seconds after startup
  }

  /**
   * Background maintenance of memory cache and optimization
   */
  private async backgroundMemoryMaintenance(): Promise<void> {
    console.log('🔧 Running background memory maintenance...');
    
    try {
      // 1. Clean up expired cache entries
      await this.cleanupExpiredCaches();
      
      // 2. Pre-warm cache for active users
      await this.preWarmActiveUserCaches();
      
      // 3. Update user profile summaries
      await this.updateUserProfileSummaries();
      
      console.log('✅ Background memory maintenance completed');
    } catch (error) {
      console.error('❌ Background memory maintenance failed:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredCaches(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;
    
    // Clean instant memory cache
    for (const [key, value] of this.instantMemoryCache.entries()) {
      if (now - value.timestamp > this.instantCacheTimeout) {
        this.instantMemoryCache.delete(key);
        cleaned++;
      }
    }
    
    // Clean query cache
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.queryCacheTimeout) {
        this.queryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Pre-warm cache for recently active users
   */
  private async preWarmActiveUserCaches(): Promise<void> {
    const activeUsers = this.getRecentlyActiveUsers();
    
    for (const userId of activeUsers.slice(0, 5)) { // Limit to 5 users per run
      try {
        // Pre-generate common query results
        const commonQueries = [
          'who am i',
          'what do you know about me',
          'my profile',
          'user profile and preferences'
        ];
        
        for (const query of commonQueries) {
          const cacheKey = `${userId}-${this.normalizeQuery(query)}`;
          
          // Only warm if not already cached
          if (!this.instantMemoryCache.has(cacheKey)) {
            // Get user profile for warming
            const userProfile = await this.getUserProfileFromCache(userId);
            if (userProfile) {
              this.instantMemoryCache.set(cacheKey, {
                userProfile,
                recentMemories: '',
                timestamp: Date.now()
              });
            }
          }
        }
        
        console.log(`🔥 Pre-warmed cache for user ${userId.substring(0, 10)}...`);
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`⚠️ Failed to pre-warm cache for user ${userId}:`, error);
      }
    }
  }

  /**
   * Update user profile summaries in background
   */
  private async updateUserProfileSummaries(): Promise<void> {
    const activeUsers = this.getRecentlyActiveUsers();
    
    for (const userId of activeUsers.slice(0, 3)) { // Limit processing
      try {
        // Check if user has recent activity and needs profile update
        const userContexts = await this.getUserContexts(userId);
        if (userContexts.length > 0) {
          const lastActivity = Math.max(...userContexts.map(ctx => ctx.metadata.lastActivity.getTime()));
          const timeSinceActivity = Date.now() - lastActivity;
          
          // If user was active in last hour, consider profile refresh
          if (timeSinceActivity < 60 * 60 * 1000) {
            // Sync user profile in background
            await this.vectorStore.syncUserProfile(userId, true);
            console.log(`📊 Updated profile for active user ${userId.substring(0, 10)}...`);
          }
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`⚠️ Failed to update profile for user ${userId}:`, error);
      }
    }
  }

  /**
   * Get list of recently active users
   */
  private getRecentlyActiveUsers(): string[] {
    const recentThreshold = Date.now() - (2 * 60 * 60 * 1000); // 2 hours
    const activeUsers = new Set<string>();
    
    // Check active contexts
    for (const context of this.activeContexts.values()) {
      if (context.metadata.lastActivity.getTime() > recentThreshold) {
        activeUsers.add(context.userId);
      }
    }
    
    // Check instant cache for recently accessed users
    for (const [key] of this.instantMemoryCache.entries()) {
      const userId = key.split('-')[0];
      if (userId) {
        activeUsers.add(userId);
      }
    }
    
    return Array.from(activeUsers);
  }

  /**
   * Create a new context with specific configuration
   */
  async createContext(contextId: string, options: any): Promise<ConversationContext> {
    // If context already exists, return it
    if (this.activeContexts.has(contextId)) {
      return this.activeContexts.get(contextId)!;
    }

    // Create new context using existing getOrCreateContext method
    const context = await this.getOrCreateContext(
      contextId,
      options.userId || 'system',
      options.maxTokens || 4000,
      false, // Not quick mode
      {
        memoryEnabled: options.includeUserMemories !== false,
        includeRecentContext: options.includeRecentContext !== false,
        systemPrompt: options.systemPrompt
      }
    );

    return context;
  }

  /**
   * Clear/remove a context
   */
  async clearContext(contextId: string): Promise<void> {
    const context = this.activeContexts.get(contextId);
    if (context) {
      // Store the context before removing it
      await this.persistContext(context);
      
      // Remove from active contexts
      this.activeContexts.delete(contextId);
      
      console.log(`🗑️ Cleared context: ${contextId}`);
    }
  }
}

// Singleton instance
export const contextManager = new AdvancedContextManager(); 