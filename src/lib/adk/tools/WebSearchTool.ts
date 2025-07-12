/**
 * ADK Web Search Tool - Firecrawl Integration
 * Implements ADK tool pattern for web search functionality
 */

import { ADKTool, ToolConfig, ToolResult } from './ADKTool';
import { FirecrawlWebSearch } from '../../search/FirecrawlWebSearch';

export class WebSearchTool extends ADKTool {
  private firecrawl: FirecrawlWebSearch;

  constructor() {
    const config: ToolConfig = {
      name: 'web-search',
      description: 'Search the web using Firecrawl API for real-time information',
      category: 'web',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'Search query to find information',
          required: true
        },
        {
          name: 'maxResults',
          type: 'number',
          description: 'Maximum number of results to return',
          required: false,
          default: 5
        },
        {
          name: 'language',
          type: 'string',
          description: 'Language for search results',
          required: false,
          default: 'en'
        }
      ],
      requiredPermissions: ['internet_access']
    };

    super(config);
    this.firecrawl = new FirecrawlWebSearch();
  }

  /**
   * Execute web search
   */
  async execute(parameters: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Validate parameters
      this.validateParameters(parameters);

      const {
        query,
        maxResults = 5,
        language = 'en'
      } = parameters;

      console.log(`🔍 ADK Web Search: "${query}"`);

      // Execute search using Firecrawl
      const searchResults = await this.firecrawl.searchWeb(query, {
        maxResults,
        language
      });

      const executionTime = Date.now() - startTime;

      // Format results for ADK pattern
      const formattedResults = searchResults.map(result => ({
        title: result.title,
        url: result.url,
        content: result.content || result.snippet,
        snippet: result.snippet,
        timestamp: result.timestamp
      }));

      console.log(`✅ ADK Web Search completed: ${formattedResults.length} results in ${executionTime}ms`);

      return this.createResult(
        true,
        {
          query,
          results: formattedResults,
          count: formattedResults.length,
          searchTime: executionTime
        },
        undefined,
        {
          executionTime,
          cost: 0.001 * Math.ceil(executionTime / 1000), // Simple cost model
          tokensUsed: query.length + (formattedResults.length * 100)
        }
      );

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Web search failed';
      
      console.error(`❌ ADK Web Search failed: ${errorMessage}`);

      return this.createResult(
        false,
        undefined,
        errorMessage,
        {
          executionTime,
          cost: 0,
          tokensUsed: 0
        }
      );
    }
  }

  /**
   * Check if web search is available
   */
  isAvailable(): boolean {
    return this.firecrawl.isAvailable();
  }

  /**
   * Health check for the tool
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.execute({
        query: 'test search',
        maxResults: 1
      });
      return result.success;
    } catch {
      return false;
    }
  }
}