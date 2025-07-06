import { Client } from '@elastic/elasticsearch';
import OpenAI from 'openai';

export interface MemoryResult {
  content: string;
  relevanceScore: number;
  conversationId: string;
  timestamp: string;
  model: string;
  memoryType?: string;
  context?: string;
}

export interface ConversationContext {
  id: string;
  userId: string;
  messages: Array<{
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
    model?: string;
  }>;
  title?: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  snippet: string;
  timestamp: string;
  relevanceScore?: number;
}

export class ElasticsearchRAG {
  private client: Client;
  private openai: OpenAI;
  private readonly indexPrefix = 'omnix';
  private isConnected = true; // Assume connected until proven otherwise

  constructor() {
    // Check if Elasticsearch is enabled
    const elasticsearchEnabled = process.env.ELASTICSEARCH_ENABLED !== 'false';
    
    if (!elasticsearchEnabled) {
      console.log('📝 Elasticsearch disabled via environment variable - RAG features will use fallback storage');
      this.isConnected = false;
      // Still initialize OpenAI for embeddings
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      return;
    }

    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_PASSWORD ? {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD
      } : undefined,
      tls: process.env.ELASTICSEARCH_TLS === 'true' ? {
        rejectUnauthorized: false
      } : undefined
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Initialize indices asynchronously without blocking
    this.initializeIndices().catch(error => {
      console.warn('⚠️ Elasticsearch initialization failed - RAG features will be limited:', error.message);
      this.isConnected = false;
    });
  }

  private async initializeIndices(): Promise<void> {
    try {
      // Create index template for conversations
      await this.client.indices.putIndexTemplate({
        name: `${this.indexPrefix}-conversations-template`,
        index_patterns: [`${this.indexPrefix}-conversations-*`],
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                multilingual: {
                  type: 'standard',
                  stopwords: ['_english_', '_turkish_', '_german_', '_french_']
                }
              }
            }
          },
          mappings: {
            properties: {
              conversationId: { type: 'keyword' },
              content: { 
                type: 'text',
                analyzer: 'multilingual',
                fields: {
                  keyword: { type: 'keyword', ignore_above: 256 }
                }
              },
              role: { type: 'keyword' },
              timestamp: { type: 'date' },
              model: { type: 'keyword' },
              userId: { type: 'keyword' },
              content_vector: {
                type: 'dense_vector',
                dims: 1536,
                index: true,
                similarity: 'cosine'
              },
              memoryType: { type: 'keyword' },
              extractedMemories: {
                type: 'nested',
                properties: {
                  type: { type: 'keyword' },
                  content: { type: 'text' },
                  confidence: { type: 'float' }
                }
              }
            }
          }
        }
      });

      // Create index template for web search results
      await this.client.indices.putIndexTemplate({
        name: `${this.indexPrefix}-websearch-template`,
        index_patterns: [`${this.indexPrefix}-websearch-*`],
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0
          },
          mappings: {
            properties: {
              title: { type: 'text' },
              url: { type: 'keyword' },
              content: { type: 'text' },
              snippet: { type: 'text' },
              timestamp: { type: 'date' },
              query: { type: 'text' },
              userId: { type: 'keyword' },
              content_vector: {
                type: 'dense_vector',
                dims: 1536,
                index: true,
                similarity: 'cosine'
              }
            }
          }
        }
      });

      console.log('✅ Elasticsearch indices initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Elasticsearch indices:', error);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit to model's max input
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  async storeConversation(userId: string, conversation: ConversationContext): Promise<void> {
    if (!this.isConnected) {
      console.warn('⚠️ Elasticsearch not connected - skipping conversation storage');
      return;
    }
    
    try {
      const indexName = `${this.indexPrefix}-conversations-${userId}`;
      
      // Process each message
      for (const message of conversation.messages) {
        if (!message.content || message.content.trim().length < 10) continue;

        const embedding = await this.generateEmbedding(message.content);
        const extractedMemories = await this.extractMemories(message.content, message.role);

        const document = {
          conversationId: conversation.id,
          content: message.content,
          role: message.role,
          timestamp: message.timestamp,
          model: message.model || 'unknown',
          userId: userId,
          content_vector: embedding,
          extractedMemories: extractedMemories,
          conversationTitle: conversation.title,
          metadata: conversation.metadata
        };

        await this.client.index({
          index: indexName,
          body: document
        });
      }

      // Refresh index for immediate availability
      await this.client.indices.refresh({ index: indexName });
      
      console.log(`✅ Stored conversation ${conversation.id} for user ${userId}`);
    } catch (error) {
      console.error('❌ Error storing conversation:', error);
    }
  }

  async searchRelevantMemories(
    userId: string,
    query: string,
    topK: number = 5,
    memoryTypes?: string[]
  ): Promise<MemoryResult[]> {
    if (!this.isConnected) {
      console.warn('⚠️ Elasticsearch not connected - returning empty memories');
      return [];
    }
    
    try {
      const indexName = `${this.indexPrefix}-conversations-${userId}`;
      const queryEmbedding = await this.generateEmbedding(query);

      // Check if index exists
      const indexExists = await this.client.indices.exists({ index: indexName });
      if (!indexExists) {
        console.log(`📦 No memories found for user ${userId}`);
        return [];
      }

      // Build search query
      const searchQuery: any = {
        bool: {
          should: [
            // Keyword search for exact matches
            {
              multi_match: {
                query: query,
                fields: ['content^2', 'extractedMemories.content^1.5'],
                type: 'best_fields',
                fuzziness: 'AUTO',
                boost: 1.0
              }
            },
            // Semantic search using embeddings
            {
              script_score: {
                query: { match_all: {} },
                script: {
                  source: "cosineSimilarity(params.query_vector, 'content_vector') + 1.0",
                  params: { query_vector: queryEmbedding }
                },
                boost: 2.0
              }
            }
          ],
          minimum_should_match: 1
        }
      };

      // Add memory type filter if specified
      if (memoryTypes && memoryTypes.length > 0) {
        searchQuery.bool.filter = [
          {
            terms: {
              'extractedMemories.type': memoryTypes
            }
          }
        ];
      }

      const searchResponse = await this.client.search({
        index: indexName,
        body: {
          query: searchQuery,
          size: topK,
          _source: ['content', 'conversationId', 'timestamp', 'model', 'extractedMemories', 'role'],
          sort: [
            { _score: { order: 'desc' } },
            { timestamp: { order: 'desc' } }
          ]
        }
      });

      const results: MemoryResult[] = searchResponse.body.hits.hits.map((hit: any) => ({
        content: hit._source.content,
        relevanceScore: hit._score,
        conversationId: hit._source.conversationId,
        timestamp: hit._source.timestamp,
        model: hit._source.model,
        memoryType: hit._source.extractedMemories?.[0]?.type || 'general',
        context: this.formatMemoryContext(hit._source)
      }));

      console.log(`🔍 Found ${results.length} relevant memories for user ${userId}`);
      return results;
    } catch (error) {
      console.error('❌ Error searching memories:', error);
      return [];
    }
  }

  async storeWebSearchResults(
    userId: string,
    query: string,
    results: SearchResult[]
  ): Promise<void> {
    if (!this.isConnected) {
      console.warn('⚠️ Elasticsearch not connected - skipping web search storage');
      return;
    }
    try {
      const indexName = `${this.indexPrefix}-websearch-${userId}`;
      
      for (const result of results) {
        const embedding = await this.generateEmbedding(result.content);

        const document = {
          title: result.title,
          url: result.url,
          content: result.content,
          snippet: result.snippet,
          timestamp: result.timestamp,
          query: query,
          userId: userId,
          content_vector: embedding
        };

        await this.client.index({
          index: indexName,
          body: document
        });
      }

      await this.client.indices.refresh({ index: indexName });
      console.log(`✅ Stored ${results.length} web search results for user ${userId}`);
    } catch (error) {
      console.error('❌ Error storing web search results:', error);
    }
  }

  async searchWebHistory(
    userId: string,
    query: string,
    topK: number = 3
  ): Promise<SearchResult[]> {
    if (!this.isConnected) {
      console.warn('⚠️ Elasticsearch not connected - returning empty web history');
      return [];
    }
    
    try {
      const indexName = `${this.indexPrefix}-websearch-${userId}`;
      const queryEmbedding = await this.generateEmbedding(query);

      const indexExists = await this.client.indices.exists({ index: indexName });
      if (!indexExists) {
        return [];
      }

      const searchResponse = await this.client.search({
        index: indexName,
        body: {
          query: {
            bool: {
              should: [
                {
                  multi_match: {
                    query: query,
                    fields: ['title^3', 'content^2', 'snippet'],
                    fuzziness: 'AUTO'
                  }
                },
                {
                  script_score: {
                    query: { match_all: {} },
                    script: {
                      source: "cosineSimilarity(params.query_vector, 'content_vector') + 1.0",
                      params: { query_vector: queryEmbedding }
                    }
                  }
                }
              ]
            }
          },
          size: topK,
          _source: ['title', 'url', 'content', 'snippet', 'timestamp'],
          sort: [
            { _score: { order: 'desc' } },
            { timestamp: { order: 'desc' } }
          ]
        }
      });

      return searchResponse.body.hits.hits.map((hit: any) => ({
        title: hit._source.title,
        url: hit._source.url,
        content: hit._source.content,
        snippet: hit._source.snippet,
        timestamp: hit._source.timestamp,
        relevanceScore: hit._score
      }));
    } catch (error) {
      console.error('❌ Error searching web history:', error);
      return [];
    }
  }

  private async extractMemories(content: string, role: string): Promise<Array<{ type: string; content: string; confidence: number }>> {
    if (role !== 'user' || content.length < 20) return [];

    try {
      const prompt = `Analyze this user message and extract any personal information, preferences, or facts. Return as JSON array.

Categories:
- preference: Things the user likes/dislikes
- skill: User's abilities or expertise
- fact: Personal facts about the user
- goal: User's objectives or intentions
- context: Important contextual information

Message: "${content}"

Return format: [{"type": "preference", "content": "extracted info", "confidence": 0.8}]
Return empty array if no extractable information.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });

      const extractedText = response.choices[0]?.message?.content || '[]';
      const memories = JSON.parse(extractedText);
      
      return Array.isArray(memories) ? memories.filter(m => m.confidence > 0.6) : [];
    } catch (error) {
      console.error('Error extracting memories:', error);
      return [];
    }
  }

  private formatMemoryContext(source: any): string {
    const memories = source.extractedMemories || [];
    if (memories.length === 0) return source.content.substring(0, 100) + '...';

    const memoryTexts = memories.map((m: any) => `${m.type}: ${m.content}`).join('; ');
    return `${memoryTexts} | Original: ${source.content.substring(0, 50)}...`;
  }

  async getMemoryStats(userId: string): Promise<{
    totalConversations: number;
    totalMemories: number;
    memoryBreakdown: Record<string, number>;
    lastActivity: string | null;
  }> {
    try {
      const indexName = `${this.indexPrefix}-conversations-${userId}`;
      
      const indexExists = await this.client.indices.exists({ index: indexName });
      if (!indexExists) {
        return {
          totalConversations: 0,
          totalMemories: 0,
          memoryBreakdown: {},
          lastActivity: null
        };
      }

      // Get total conversations
      const conversationsAgg = await this.client.search({
        index: indexName,
        body: {
          size: 0,
          aggs: {
            unique_conversations: {
              cardinality: {
                field: 'conversationId'
              }
            },
            memory_types: {
              nested: {
                path: 'extractedMemories'
              },
              aggs: {
                types: {
                  terms: {
                    field: 'extractedMemories.type',
                    size: 10
                  }
                }
              }
            },
            latest_activity: {
              max: {
                field: 'timestamp'
              }
            }
          }
        }
      });

      const aggs = conversationsAgg.body.aggregations;
      const memoryBreakdown: Record<string, number> = {};
      
      if (aggs.memory_types.types.buckets) {
        aggs.memory_types.types.buckets.forEach((bucket: any) => {
          memoryBreakdown[bucket.key] = bucket.doc_count;
        });
      }

      return {
        totalConversations: aggs.unique_conversations.value,
        totalMemories: Object.values(memoryBreakdown).reduce((sum, count) => sum + count, 0),
        memoryBreakdown,
        lastActivity: aggs.latest_activity.value_as_string || null
      };
    } catch (error) {
      console.error('❌ Error getting memory stats:', error);
      return {
        totalConversations: 0,
        totalMemories: 0,
        memoryBreakdown: {},
        lastActivity: null
      };
    }
  }

  async clearUserMemories(userId: string): Promise<void> {
    try {
      const conversationIndex = `${this.indexPrefix}-conversations-${userId}`;
      const websearchIndex = `${this.indexPrefix}-websearch-${userId}`;

      // Delete conversation memories
      const convExists = await this.client.indices.exists({ index: conversationIndex });
      if (convExists) {
        await this.client.indices.delete({ index: conversationIndex });
      }

      // Delete web search history
      const webExists = await this.client.indices.exists({ index: websearchIndex });
      if (webExists) {
        await this.client.indices.delete({ index: websearchIndex });
      }

      console.log(`✅ Cleared all memories for user ${userId}`);
    } catch (error) {
      console.error('❌ Error clearing user memories:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  async isInitialized(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health();
      return health.statusCode === 200;
    } catch {
      return false;
    }
  }
}