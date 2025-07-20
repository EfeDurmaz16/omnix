import OpenAI from 'openai';

interface Memory {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    timestamp: Date;
    importance: number;
    entities: string[];
    topics: string[];
  };
}

interface CompressedContext {
  content: string;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  preservedEntities: string[];
  importantSentences: string[];
  technique: string;
}

interface SelectiveContext {
  memories: Memory[];
  content: string;
  totalTokens: number;
  selectedCount: number;
}

export class AdvancedContextCompression {
  private openai: OpenAI;
  private readonly TARGET_COMPRESSION_RATIO = 0.3; // Compress to 30%
  private readonly IMPORTANCE_THRESHOLD = 0.7;
  private readonly SENTENCE_MIN_LENGTH = 20;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Main compression pipeline - applies multiple techniques for optimal results
   */
  async compressMemories(
    memories: Memory[],
    queryContext: string,
    tokenBudget: number = 4000
  ): Promise<CompressedContext> {
    const startTime = Date.now();
    console.log(`🗜️ Starting context compression for ${memories.length} memories, budget: ${tokenBudget} tokens`);

    if (memories.length === 0) {
      return {
        content: '',
        originalTokens: 0,
        compressedTokens: 0,
        compressionRatio: 1.0,
        preservedEntities: [],
        importantSentences: [],
        technique: 'empty'
      };
    }

    // 1. Apply Selective Context algorithm first
    const selectiveContext = await this.selectiveContext(memories, queryContext);
    console.log(`📋 Selective context: ${selectiveContext.selectedCount}/${memories.length} memories selected`);

    const originalTokens = selectiveContext.totalTokens;

    // 2. If still over budget, apply intelligent compression
    if (originalTokens <= tokenBudget) {
      console.log(`✅ Context within budget, returning selective context`);
      return {
        content: selectiveContext.content,
        originalTokens,
        compressedTokens: originalTokens,
        compressionRatio: 1.0,
        preservedEntities: this.extractAllEntities(selectiveContext.memories),
        importantSentences: this.extractImportantSentences(selectiveContext.content),
        technique: 'selective-only'
      };
    }

    // 3. Apply semantic compression
    console.log(`🔄 Applying semantic compression, target: ${Math.floor(tokenBudget * 0.9)} tokens`);
    const compressed = await this.semanticCompression(
      selectiveContext.content,
      queryContext,
      Math.floor(tokenBudget * 0.9) // Leave 10% buffer
    );

    console.log(`✅ Compression completed in ${Date.now() - startTime}ms:`, {
      originalTokens,
      compressedTokens: compressed.compressedTokens,
      ratio: compressed.compressionRatio,
      technique: compressed.technique
    });

    return {
      ...compressed,
      originalTokens,
      preservedEntities: this.extractAllEntities(selectiveContext.memories)
    };
  }

  /**
   * Selective Context algorithm - intelligently selects most relevant memories
   */
  private async selectiveContext(
    memories: Memory[],
    query: string
  ): Promise<SelectiveContext> {
    console.log(`🎯 Running selective context algorithm for query: "${query.substring(0, 50)}..."`);

    // 1. Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // 2. Score memories based on multiple factors
    const scoredMemories = await Promise.all(
      memories.map(async (memory) => {
        const score = await this.scoreMemory(memory, query, queryEmbedding);
        return { memory, score };
      })
    );

    // 3. Sort by score
    scoredMemories.sort((a, b) => b.score - a.score);

    // 4. Select memories using dynamic threshold
    const threshold = this.calculateDynamicThreshold(scoredMemories.map(sm => sm.score));
    const selected = scoredMemories.filter(sm => sm.score >= threshold);

    console.log(`📊 Scoring results:`, {
      totalMemories: memories.length,
      threshold: threshold.toFixed(3),
      selected: selected.length,
      topScore: scoredMemories[0]?.score.toFixed(3),
      avgScore: (scoredMemories.reduce((sum, sm) => sum + sm.score, 0) / scoredMemories.length).toFixed(3)
    });

    // 5. Format selected memories
    const content = this.formatMemories(selected.map(sm => sm.memory));
    const totalTokens = this.estimateTokens(content);

    return {
      memories: selected.map(sm => sm.memory),
      content,
      totalTokens,
      selectedCount: selected.length
    };
  }

  /**
   * Advanced memory scoring considering multiple relevance factors
   */
  private async scoreMemory(
    memory: Memory,
    query: string,
    queryEmbedding: number[]
  ): Promise<number> {
    let score = 0;

    // 1. Semantic similarity (40% weight)
    if (memory.embedding) {
      const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
      score += similarity * 0.4;
    }

    // 2. Keyword overlap (20% weight)
    const keywordScore = this.calculateKeywordOverlap(query, memory.content);
    score += keywordScore * 0.2;

    // 3. Importance score (15% weight)
    score += memory.metadata.importance * 0.15;

    // 4. Recency boost (15% weight)
    const recencyScore = this.calculateRecencyScore(memory.metadata.timestamp);
    score += recencyScore * 0.15;

    // 5. Entity relevance (10% weight)
    const entityScore = this.calculateEntityRelevance(query, memory.metadata.entities);
    score += entityScore * 0.1;

    return Math.min(1.0, score); // Cap at 1.0
  }

  /**
   * Semantic compression using LLM for intelligent content reduction
   */
  private async semanticCompression(
    content: string,
    queryContext: string,
    targetTokens: number
  ): Promise<CompressedContext> {
    try {
      // Split content into sentences for better compression
      const sentences = this.splitIntoSentences(content);
      console.log(`📝 Semantic compression: ${sentences.length} sentences → target ${targetTokens} tokens`);

      // Apply sentence-level compression
      const compressed = await this.compressSentences(sentences, queryContext, targetTokens);

      return {
        content: compressed.text,
        originalTokens: this.estimateTokens(content),
        compressedTokens: this.estimateTokens(compressed.text),
        compressionRatio: this.estimateTokens(compressed.text) / this.estimateTokens(content),
        preservedEntities: compressed.entities,
        importantSentences: compressed.importantSentences,
        technique: 'semantic-compression'
      };

    } catch (error) {
      console.error('❌ Semantic compression failed:', error);
      
      // Fallback to simple truncation
      const truncated = this.simpleTruncation(content, targetTokens);
      return {
        content: truncated,
        originalTokens: this.estimateTokens(content),
        compressedTokens: this.estimateTokens(truncated),
        compressionRatio: this.estimateTokens(truncated) / this.estimateTokens(content),
        preservedEntities: [],
        importantSentences: [],
        technique: 'fallback-truncation'
      };
    }
  }

  /**
   * Compress sentences while preserving important information
   */
  private async compressSentences(
    sentences: string[],
    queryContext: string,
    targetTokens: number
  ): Promise<{
    text: string;
    entities: string[];
    importantSentences: string[];
  }> {
    // Score sentences by importance
    const scoredSentences = sentences.map(sentence => ({
      sentence,
      score: this.scoreSentence(sentence, queryContext),
      tokens: this.estimateTokens(sentence)
    }));

    // Sort by score
    scoredSentences.sort((a, b) => b.score - a.score);

    // Select sentences within token budget
    const selected: typeof scoredSentences = [];
    let currentTokens = 0;

    for (const scoredSentence of scoredSentences) {
      if (currentTokens + scoredSentence.tokens <= targetTokens) {
        selected.push(scoredSentence);
        currentTokens += scoredSentence.tokens;
      }
    }

    // Preserve original order
    selected.sort((a, b) => 
      sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
    );

    const compressedText = selected.map(s => s.sentence).join(' ');
    const entities = this.extractEntitiesFromText(compressedText);
    const importantSentences = selected
      .filter(s => s.score > 0.8)
      .map(s => s.sentence);

    return {
      text: compressedText,
      entities,
      importantSentences
    };
  }

  /**
   * Score individual sentences for importance
   */
  private scoreSentence(sentence: string, queryContext: string): number {
    let score = 0;

    // Length bonus (longer sentences often more informative)
    if (sentence.length > this.SENTENCE_MIN_LENGTH) {
      score += 0.2;
    }

    // Question words (important for context)
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
    if (questionWords.some(word => sentence.toLowerCase().includes(word))) {
      score += 0.3;
    }

    // Code/technical content
    if (sentence.includes('```') || sentence.includes('function') || 
        sentence.includes('const ') || sentence.includes('import ')) {
      score += 0.4;
    }

    // Query keyword overlap
    const queryWords = queryContext.toLowerCase().split(/\s+/);
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    const overlap = queryWords.filter(word => 
      sentenceWords.some(sw => sw.includes(word))
    ).length;
    score += (overlap / queryWords.length) * 0.3;

    // Entities and proper nouns
    const properNouns = sentence.match(/\b[A-Z][a-z]+\b/g) || [];
    score += Math.min(0.2, properNouns.length * 0.05);

    return Math.min(1.0, score);
  }

  /**
   * Helper methods
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        encoding_format: 'float'
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      return new Array(1536).fill(0); // Fallback
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateKeywordOverlap(query: string, content: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const contentWords = new Set(content.toLowerCase().split(/\s+/));
    const intersection = new Set([...queryWords].filter(x => contentWords.has(x)));
    return queryWords.size > 0 ? intersection.size / queryWords.size : 0;
  }

  private calculateRecencyScore(timestamp: Date): number {
    const now = Date.now();
    const age = now - timestamp.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Exponential decay over 30 days
    return Math.exp(-age / (30 * dayMs));
  }

  private calculateEntityRelevance(query: string, entities: string[]): number {
    const queryLower = query.toLowerCase();
    const relevantEntities = entities.filter(entity => 
      queryLower.includes(entity.toLowerCase())
    );
    return entities.length > 0 ? relevantEntities.length / entities.length : 0;
  }

  private calculateDynamicThreshold(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    const sortedScores = scores.sort((a, b) => b - a);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const stdDev = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    );
    
    // Use mean + 0.5 * stdDev as threshold, but cap at reasonable values
    return Math.max(0.5, Math.min(0.8, mean + 0.5 * stdDev));
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > this.SENTENCE_MIN_LENGTH);
  }

  private formatMemories(memories: Memory[]): string {
    return memories
      .map(memory => `[${memory.metadata.timestamp.toISOString()}] ${memory.content}`)
      .join('\n\n');
  }

  private extractAllEntities(memories: Memory[]): string[] {
    const allEntities = memories.flatMap(m => m.metadata.entities);
    return [...new Set(allEntities)];
  }

  private extractImportantSentences(content: string): string[] {
    return this.splitIntoSentences(content)
      .filter(sentence => this.scoreSentence(sentence, '') > 0.8);
  }

  private extractEntitiesFromText(text: string): string[] {
    // Simple entity extraction
    const entities = [];
    
    // Names (capitalized words)
    const names = text.match(/\b[A-Z][a-z]+\b/g) || [];
    entities.push(...names);
    
    // Emails
    const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    entities.push(...emails);
    
    return [...new Set(entities)];
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }

  private simpleTruncation(content: string, targetTokens: number): string {
    const targetChars = targetTokens * 4;
    if (content.length <= targetChars) return content;
    
    // Try to truncate at sentence boundary
    const truncated = content.substring(0, targetChars);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > targetChars * 0.8) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }
}