import FirecrawlApp from '@mendable/firecrawl-js';
import { SearchResult } from '../rag/ElasticsearchRAG';

export interface WebSearchOptions {
  maxResults?: number;
  includeImages?: boolean;
  includePDFs?: boolean;
  language?: string;
  freshness?: 'day' | 'week' | 'month' | 'year';
}

export interface EnhancedResponse {
  originalResponse: string;
  webResults?: SearchResult[];
  enhancedResponse?: string;
  sources?: Array<{ title: string; url: string; relevance?: number }>;
  needsWebSearch?: boolean;
  searchQuery?: string;
}

export class FirecrawlWebSearch {
  private client: FirecrawlApp;
  private isEnabled: boolean;

  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    this.isEnabled = !!apiKey;
    
    if (this.isEnabled) {
      this.client = new FirecrawlApp({ apiKey });
      console.log('🔥 Firecrawl Web Search initialized');
    } else {
      console.warn('⚠️ Firecrawl API key not found - web search disabled');
    }
  }

  async searchWeb(
    query: string, 
    options: WebSearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.isEnabled) {
      console.warn('⚠️ Web search disabled - no Firecrawl API key');
      return [];
    }

    try {
      const {
        maxResults = 5,
        includeImages = false,
        includePDFs = true,
        language = 'en',
        freshness
      } = options;

      console.log(`🔍 Searching web for: "${query}"`);

      // Use Firecrawl's search functionality
      const searchResponse = await this.client.search(query, {
        limit: maxResults,
        lang: language,
        ...(freshness && { freshness })
      });

      if (!searchResponse.success || !searchResponse.data) {
        console.error('❌ Firecrawl search failed:', searchResponse.error);
        return [];
      }

      console.log(`🔍 Raw search response data:`, JSON.stringify(searchResponse.data, null, 2));
      
      const results: SearchResult[] = searchResponse.data
        .filter(result => {
          const hasContent = result.description && result.description.length > 10;
          console.log(`📄 Result filtering: ${result.title || 'No title'} - Description length: ${result.description?.length || 0} - Include: ${hasContent}`);
          return hasContent;
        })
        .map(result => ({
          title: result.title || 'No title',
          url: result.url || '',
          content: result.description || '',
          snippet: result.description || '',
          timestamp: new Date().toISOString()
        }));

      console.log(`✅ Found ${results.length} web results for: "${query}"`);
      return results;

    } catch (error: any) {
      console.error('❌ Web search error:', error);
      
      // Return empty results instead of throwing
      return [];
    }
  }

  async crawlUrl(url: string): Promise<SearchResult | null> {
    if (!this.isEnabled) {
      console.warn('⚠️ Web crawling disabled - no Firecrawl API key');
      return null;
    }

    try {
      console.log(`🕷️ Crawling URL: ${url}`);

      const crawlResponse = await this.client.scrapeUrl(url);

      if (!crawlResponse.success || !crawlResponse.data) {
        console.error('❌ URL crawl failed:', crawlResponse.error);
        return null;
      }

      const data = crawlResponse.data;
      
      return {
        title: data.title || 'No title',
        url: url,
        content: data.content || data.description || '',
        snippet: (data.content || data.description || '').substring(0, 300) + '...',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ URL crawl error:', error);
      return null;
    }
  }

  async enhanceResponseWithWeb(
    userQuery: string,
    aiResponse: string,
    forceSearch = false
  ): Promise<EnhancedResponse> {
    const needsWebSearch = forceSearch || this.shouldSearchWeb(userQuery, aiResponse);
    
    if (!needsWebSearch) {
      return {
        originalResponse: aiResponse,
        needsWebSearch: false
      };
    }

    const searchQuery = this.extractSearchQuery(userQuery, aiResponse);
    const webResults = await this.searchWeb(searchQuery, { maxResults: 3 });

    if (webResults.length === 0) {
      return {
        originalResponse: aiResponse,
        needsWebSearch: true,
        searchQuery
      };
    }

    const enhancedResponse = await this.synthesizeWithWebData(aiResponse, webResults);

    return {
      originalResponse: aiResponse,
      webResults,
      enhancedResponse,
      sources: webResults.map(r => ({
        title: r.title,
        url: r.url,
        relevance: this.calculateRelevance(userQuery, r.content)
      })),
      needsWebSearch: true,
      searchQuery
    };
  }

  shouldSearchWeb(userQuery: string, aiResponse: string): boolean {
    const query = userQuery.toLowerCase();
    const response = aiResponse.toLowerCase();

    // Web search indicators in user query (English and Turkish)
    const queryIndicators = [
      // English indicators
      'current', 'latest', 'recent', 'today', 'now', 'this year', '2024', '2025',
      'news', 'breaking', 'update', 'real-time',
      'price', 'cost', 'stock price', 'market',
      'weather', 'forecast',
      'events', 'happening', 'schedule',
      'who is', 'what is happening', 'latest on',
      'search for', 'find information', 'look up',
      
      // Turkish indicators
      'güncel', 'son', 'yeni', 'bugün', 'şimdi', 'bu yıl', 'devam eden', 'süren',
      'haber', 'haberleri', 'son dakika', 'güncelleme', 'canlı',
      'fiyat', 'maliyet', 'piyasa', 'borsa',
      'hava durumu', 'tahmin',
      'etkinlik', 'oluyor', 'yaşanan', 'gerçekleşen',
      'kim', 'neler oluyor', 'son durum',
      'ara', 'bul', 'bilgi al', 'hakkında',
      'yangın', 'yangınlar', 'orman yangını', 'yangınları',
      'afet', 'doğal afet', 'acil durum'
    ];

    // Response uncertainty indicators (English and Turkish)
    const responseIndicators = [
      // English
      'i don\'t have', 'i\'m not sure', 'as of my last update',
      'might have changed', 'check the latest', 'verify this information',
      'i cannot access real-time', 'my knowledge cutoff',
      
      // Turkish
      'bilgim yok', 'emin değilim', 'son güncellemeye göre',
      'değişmiş olabilir', 'son durumu kontrol et', 'bu bilgiyi doğrula',
      'gerçek zamanlı', 'bilgi kesim tarihi'
    ];

    const hasQueryIndicator = queryIndicators.some(indicator => 
      query.includes(indicator)
    );

    const hasResponseIndicator = responseIndicators.some(indicator => 
      response.includes(indicator)
    );

    // Log the detection for debugging
    if (hasQueryIndicator || hasResponseIndicator) {
      console.log(`🔍 Web search triggered for query: "${userQuery}" - Query indicator: ${hasQueryIndicator}, Response indicator: ${hasResponseIndicator}`);
    } else {
      console.log(`🚫 Web search not triggered for query: "${userQuery}" - No indicators found`);
    }

    return hasQueryIndicator || hasResponseIndicator;
  }

  private extractSearchQuery(userQuery: string, aiResponse: string): string {
    // Remove common question words and extract key terms (English and Turkish)
    const cleanQuery = userQuery
      .replace(/^(what|how|when|where|why|who|which|can you|please|tell me|find|search|nedir|nasıl|ne zaman|nerede|neden|kim|hangi|hakkında|bul|ara)/i, '')
      .replace(/\?/g, '')
      .trim();

    // If query is too short, try to extract from AI response
    if (cleanQuery.length < 10) {
      const sentences = aiResponse.split('.').slice(0, 2);
      return sentences.join(' ').substring(0, 100);
    }

    return cleanQuery.substring(0, 100);
  }

  private async synthesizeWithWebData(
    originalResponse: string,
    webResults: SearchResult[]
  ): Promise<string> {
    if (webResults.length === 0) return originalResponse;

    const webContext = webResults
      .map(result => `Source: ${result.title}\n${result.snippet}`)
      .join('\n\n');

    // Simple synthesis - in production, you might want to use an LLM for this
    const synthesis = `${originalResponse}

**Updated with current information:**

${webContext}

**Sources:**
${webResults.map(r => `• [${r.title}](${r.url})`).join('\n')}`;

    return synthesis;
  }

  private cleanMarkdownContent(markdown: string): string {
    // Remove excessive whitespace and clean up markdown
    return markdown
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
      .replace(/^\s+|\s+$/gm, '') // Trim lines
      .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '') // Remove linked images
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\*{3,}/g, '**') // Normalize bold formatting
      .trim();
  }

  private extractTitleFromContent(content: string): string | null {
    // Try to extract title from first heading or first line
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines.slice(0, 5)) {
      // Check for markdown headings
      const headingMatch = line.match(/^#+\s*(.+)/);
      if (headingMatch) {
        return headingMatch[1].trim();
      }
      
      // Check for title-like content (first substantial line)
      if (line.length > 10 && line.length < 100 && !line.includes('http')) {
        return line.trim();
      }
    }
    
    return null;
  }

  private generateSnippet(content: string, query: string): string {
    const words = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Find sentence with most query words
    let bestSentence = sentences[0] || '';
    let maxMatches = 0;
    
    for (const sentence of sentences.slice(0, 10)) {
      const matches = words.filter(word => 
        sentence.toLowerCase().includes(word)
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestSentence = sentence;
      }
    }
    
    return bestSentence.trim().substring(0, 300) + '...';
  }

  private calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        matches++;
      }
    }
    
    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  async getSearchHistory(userId: string, limit = 10): Promise<Array<{ query: string; timestamp: string; resultsCount: number }>> {
    // This would integrate with your database to store search history
    // For now, return empty array
    return [];
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled) return false;
    
    try {
      // Test with a simple search
      const testResult = await this.searchWeb('test', { maxResults: 1 });
      return true;
    } catch {
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isEnabled;
  }
}