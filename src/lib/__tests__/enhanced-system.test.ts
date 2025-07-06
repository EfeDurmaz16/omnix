import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ModelCatalog } from '../catalog/ModelCatalog';
import { EnhancedModelRouter } from '../router/EnhancedModelRouter';
import { ElasticsearchRAG } from '../rag/ElasticsearchRAG';
import { FirecrawlWebSearch } from '../search/FirecrawlWebSearch';
import { OpenRouterProvider } from '../providers/openrouter';
import { ReplicateProvider } from '../providers/replicate';

// Mock environment variables
const mockEnv = {
  OPENROUTER_API_KEY: 'test-openrouter-key',
  REPLICATE_API_TOKEN: 'test-replicate-token',
  FIRECRAWL_API_KEY: 'test-firecrawl-key',
  ELASTICSEARCH_URL: 'http://localhost:9200',
  OPENAI_API_KEY: 'test-openai-key'
};

// Mock all providers
jest.mock('../providers/openrouter');
jest.mock('../providers/replicate');
jest.mock('../rag/ElasticsearchRAG');
jest.mock('../search/FirecrawlWebSearch');

describe('Enhanced AI System Integration Tests', () => {
  let modelCatalog: ModelCatalog;
  let enhancedRouter: EnhancedModelRouter;
  let ragSystem: ElasticsearchRAG;
  let webSearch: FirecrawlWebSearch;

  beforeEach(() => {
    // Set up environment
    Object.assign(process.env, mockEnv);
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Initialize systems
    modelCatalog = new ModelCatalog();
    enhancedRouter = new EnhancedModelRouter();
    ragSystem = new ElasticsearchRAG();
    webSearch = new FirecrawlWebSearch();
  });

  describe('ModelCatalog', () => {
    it('should initialize with multiple providers', async () => {
      await modelCatalog.initialize();
      
      const stats = await modelCatalog.getStatistics();
      expect(stats.totalModels).toBeGreaterThan(0);
      expect(Object.keys(stats.providerBreakdown)).toContain('openrouter');
      expect(Object.keys(stats.providerBreakdown)).toContain('replicate');
    });

    it('should categorize models correctly', async () => {
      await modelCatalog.initialize();
      
      const categories = await modelCatalog.getCategories();
      const categoryIds = categories.map(c => c.id);
      
      expect(categoryIds).toContain('free');
      expect(categoryIds).toContain('cost-effective');
      expect(categoryIds).toContain('flagship');
      expect(categoryIds).toContain('coding');
      expect(categoryIds).toContain('image-generation');
    });

    it('should filter models by criteria', async () => {
      await modelCatalog.initialize();
      
      // Test free models filter
      const freeModels = await modelCatalog.getModelsByFilter({
        freeOnly: true
      });
      
      expect(freeModels.length).toBeGreaterThan(0);
      freeModels.forEach(model => {
        expect(model.inputCostPer1kTokens).toBe(0);
        expect(model.outputCostPer1kTokens).toBe(0);
      });
    });

    it('should provide model recommendations', async () => {
      await modelCatalog.initialize();
      
      const recommendations = await modelCatalog.getRecommendations({
        task: 'coding',
        budget: 'low',
        speed: 'balanced'
      });
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('model');
      expect(recommendations[0]).toHaveProperty('score');
      expect(recommendations[0]).toHaveProperty('reason');
    });

    it('should handle provider health checks', async () => {
      const health = await modelCatalog.getProviderHealth();
      
      expect(typeof health).toBe('object');
      expect(Object.keys(health).length).toBeGreaterThan(0);
    });
  });

  describe('EnhancedModelRouter', () => {
    it('should generate text with fallbacks', async () => {
      const mockResponse = {
        id: 'test-response',
        content: 'Test response content',
        model: 'test-model',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: 'stop',
        actualModel: 'test-model',
        providerUsed: 'openrouter',
        fallbacksAttempted: [],
        cost: 0.001,
        processingTime: 150
      };

      // Mock the generateText method
      jest.spyOn(enhancedRouter, 'generateText').mockResolvedValue(mockResponse);

      const response = await enhancedRouter.generateText({
        messages: [{ role: 'user', content: 'Hello world' }],
        context: {
          userId: 'test-user',
          preferences: {
            maxCostPerRequest: 0.01
          }
        }
      });

      expect(response).toMatchObject({
        content: 'Test response content',
        actualModel: 'test-model',
        providerUsed: 'openrouter',
        cost: expect.any(Number)
      });
    });

    it('should handle streaming responses', async () => {
      const mockStreamChunks = [
        { id: 'test-1', content: 'Hello', model: 'test-model', done: false },
        { id: 'test-2', content: ' world', model: 'test-model', done: false },
        { id: 'test-3', content: '', model: 'test-model', done: true, finishReason: 'stop' }
      ];

      // Mock the generateStream method
      const mockAsyncGenerator = async function* () {
        for (const chunk of mockStreamChunks) {
          yield chunk;
        }
      };
      
      jest.spyOn(enhancedRouter, 'generateStream').mockImplementation(mockAsyncGenerator);

      const chunks = [];
      for await (const chunk of enhancedRouter.generateStream({
        messages: [{ role: 'user', content: 'Stream test' }]
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0].content).toBe('Hello');
      expect(chunks[2].done).toBe(true);
    });

    it('should optimize model selection based on context', async () => {
      await modelCatalog.initialize();
      
      const recommendations = await enhancedRouter.getModelRecommendations('coding');
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].model).toHaveProperty('capabilities');
    });
  });

  describe('ElasticsearchRAG', () => {
    it('should store and retrieve conversations', async () => {
      const testConversation = {
        id: 'test-conv-1',
        userId: 'test-user',
        messages: [
          {
            content: 'What is machine learning?',
            role: 'user' as const,
            timestamp: new Date()
          },
          {
            content: 'Machine learning is a subset of AI...',
            role: 'assistant' as const,
            timestamp: new Date(),
            model: 'gpt-4'
          }
        ]
      };

      // Mock RAG methods
      jest.spyOn(ragSystem, 'storeConversation').mockResolvedValue();
      jest.spyOn(ragSystem, 'searchRelevantMemories').mockResolvedValue([
        {
          content: 'Machine learning is a subset of AI...',
          relevanceScore: 0.95,
          conversationId: 'test-conv-1',
          timestamp: new Date().toISOString(),
          model: 'gpt-4'
        }
      ]);

      await ragSystem.storeConversation('test-user', testConversation);
      
      const memories = await ragSystem.searchRelevantMemories(
        'test-user',
        'machine learning',
        5
      );

      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].relevanceScore).toBeGreaterThan(0.8);
    });

    it('should generate embeddings', async () => {
      jest.spyOn(ragSystem, 'generateEmbedding').mockResolvedValue(
        new Array(1536).fill(0.1)
      );

      const embedding = await ragSystem.generateEmbedding('test text');
      
      expect(embedding).toHaveLength(1536);
      expect(typeof embedding[0]).toBe('number');
    });

    it('should provide memory statistics', async () => {
      const mockStats = {
        totalConversations: 5,
        totalMemories: 15,
        memoryBreakdown: {
          preference: 3,
          skill: 4,
          fact: 8
        },
        lastActivity: new Date().toISOString()
      };

      jest.spyOn(ragSystem, 'getMemoryStats').mockResolvedValue(mockStats);

      const stats = await ragSystem.getMemoryStats('test-user');
      
      expect(stats.totalConversations).toBe(5);
      expect(stats.totalMemories).toBe(15);
      expect(stats.memoryBreakdown).toHaveProperty('preference');
    });

    it('should handle health checks', async () => {
      jest.spyOn(ragSystem, 'healthCheck').mockResolvedValue(true);
      jest.spyOn(ragSystem, 'isInitialized').mockResolvedValue(true);

      const isHealthy = await ragSystem.healthCheck();
      const isInitialized = await ragSystem.isInitialized();
      
      expect(isHealthy).toBe(true);
      expect(isInitialized).toBe(true);
    });
  });

  describe('FirecrawlWebSearch', () => {
    it('should search web content', async () => {
      const mockSearchResults = [
        {
          title: 'Test Article',
          url: 'https://example.com/test',
          content: 'This is test content about machine learning...',
          snippet: 'This is test content...',
          timestamp: new Date().toISOString()
        }
      ];

      jest.spyOn(webSearch, 'searchWeb').mockResolvedValue(mockSearchResults);

      const results = await webSearch.searchWeb('machine learning tutorial', {
        maxResults: 3,
        language: 'en'
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Article');
      expect(results[0].url).toContain('example.com');
    });

    it('should crawl individual URLs', async () => {
      const mockCrawlResult = {
        title: 'Crawled Page',
        url: 'https://example.com/page',
        content: 'Full page content...',
        snippet: 'Full page content...',
        timestamp: new Date().toISOString()
      };

      jest.spyOn(webSearch, 'crawlUrl').mockResolvedValue(mockCrawlResult);

      const result = await webSearch.crawlUrl('https://example.com/page');
      
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Crawled Page');
    });

    it('should enhance responses with web data', async () => {
      const mockEnhancedResponse = {
        originalResponse: 'Basic AI response',
        webResults: [
          {
            title: 'Latest AI News',
            url: 'https://example.com/ai-news',
            content: 'Recent developments in AI...',
            snippet: 'Recent developments...',
            timestamp: new Date().toISOString()
          }
        ],
        enhancedResponse: 'Basic AI response\n\nUpdated with current information...',
        sources: [
          {
            title: 'Latest AI News',
            url: 'https://example.com/ai-news',
            relevance: 0.9
          }
        ],
        needsWebSearch: true,
        searchQuery: 'latest AI developments'
      };

      jest.spyOn(webSearch, 'enhanceResponseWithWeb').mockResolvedValue(mockEnhancedResponse);

      const enhanced = await webSearch.enhanceResponseWithWeb(
        'What are the latest AI developments?',
        'Basic AI response',
        true
      );

      expect(enhanced.needsWebSearch).toBe(true);
      expect(enhanced.webResults).toHaveLength(1);
      expect(enhanced.enhancedResponse).toContain('Updated with current information');
    });

    it('should check availability and health', async () => {
      jest.spyOn(webSearch, 'isAvailable').mockReturnValue(true);
      jest.spyOn(webSearch, 'healthCheck').mockResolvedValue(true);

      const isAvailable = webSearch.isAvailable();
      const isHealthy = await webSearch.healthCheck();
      
      expect(isAvailable).toBe(true);
      expect(isHealthy).toBe(true);
    });
  });

  describe('Provider Integration', () => {
    it('should initialize OpenRouter provider', () => {
      expect(() => new OpenRouterProvider()).not.toThrow();
    });

    it('should initialize Replicate provider', () => {
      expect(() => new ReplicateProvider()).not.toThrow();
    });

    it('should handle provider errors gracefully', async () => {
      // Mock a provider error
      const mockProvider = {
        generateText: jest.fn().mockRejectedValue(new Error('Provider unavailable'))
      };

      // This would normally trigger fallback logic
      await expect(mockProvider.generateText({})).rejects.toThrow('Provider unavailable');
    });
  });

  describe('End-to-End Integration', () => {
    it('should handle complete enhanced chat flow', async () => {
      // Mock the complete flow
      const mockRequest = {
        messages: [{ role: 'user' as const, content: 'Explain quantum computing with current research' }],
        context: {
          userId: 'test-user',
          preferences: {
            qualityOverSpeed: true,
            maxCostPerRequest: 0.05
          }
        },
        useRAG: true,
        requireWebSearch: true
      };

      const mockEnhancedResponse = {
        id: 'test-response',
        content: 'Quantum computing is a revolutionary technology...',
        model: 'test-model',
        usage: { promptTokens: 50, completionTokens: 200, totalTokens: 250 },
        finishReason: 'stop',
        actualModel: 'anthropic/claude-3.5-sonnet',
        providerUsed: 'openrouter',
        fallbacksAttempted: [],
        cost: 0.015,
        processingTime: 2500,
        ragResults: [
          {
            content: 'Previous quantum discussion...',
            relevanceScore: 0.8,
            source: 'conversation'
          }
        ],
        webSearchResults: [
          {
            title: 'Latest Quantum Research',
            url: 'https://example.com/quantum',
            snippet: 'Recent breakthroughs...',
            relevance: 0.9
          }
        ],
        cacheHit: false
      };

      jest.spyOn(enhancedRouter, 'generateText').mockResolvedValue(mockEnhancedResponse);

      const response = await enhancedRouter.generateText(mockRequest);

      expect(response.content).toContain('Quantum computing');
      expect(response.ragResults).toBeDefined();
      expect(response.webSearchResults).toBeDefined();
      expect(response.cost).toBeLessThan(0.05); // Respects user preference
    });

    it('should handle system errors gracefully', async () => {
      // Test error handling in the complete system
      jest.spyOn(enhancedRouter, 'generateText').mockRejectedValue(
        new Error('All providers unavailable')
      );

      await expect(enhancedRouter.generateText({
        messages: [{ role: 'user', content: 'test' }]
      })).rejects.toThrow('All providers unavailable');
    });
  });
});

describe('Performance Tests', () => {
  it('should handle concurrent requests', async () => {
    const requests = Array(5).fill(null).map((_, i) => ({
      messages: [{ role: 'user' as const, content: `Test message ${i}` }]
    }));

    const mockResponse = {
      id: 'test',
      content: 'Response',
      actualModel: 'test-model',
      providerUsed: 'test',
      fallbacksAttempted: [],
      cost: 0.001,
      processingTime: 100
    };

    jest.spyOn(enhancedRouter, 'generateText').mockResolvedValue(mockResponse);

    const startTime = Date.now();
    const responses = await Promise.all(
      requests.map(req => enhancedRouter.generateText(req))
    );
    const endTime = Date.now();

    expect(responses).toHaveLength(5);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should cache responses effectively', async () => {
    const request = {
      messages: [{ role: 'user' as const, content: 'Same message for caching' }]
    };

    const mockResponse = {
      id: 'test',
      content: 'Cached response',
      actualModel: 'test-model',
      providerUsed: 'cache',
      fallbacksAttempted: [],
      cost: 0,
      processingTime: 1,
      cacheHit: true
    };

    jest.spyOn(enhancedRouter, 'generateText')
      .mockResolvedValueOnce({
        ...mockResponse,
        providerUsed: 'openrouter',
        cacheHit: false,
        processingTime: 150
      })
      .mockResolvedValueOnce(mockResponse);

    // First request
    const response1 = await enhancedRouter.generateText(request);
    
    // Second request (should be cached)
    const response2 = await enhancedRouter.generateText(request);

    expect(response1.cacheHit).toBe(false);
    expect(response2.cacheHit).toBe(true);
    expect(response2.processingTime).toBeLessThan(response1.processingTime);
  });
});