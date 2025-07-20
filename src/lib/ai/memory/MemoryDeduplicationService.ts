import { AdvancedContextManager } from '@/lib/context/AdvancedContextManager';
import OpenAI from 'openai';

interface SimilarityResult {
  memory: any;
  score: number;
  isDuplicate: boolean;
  shouldMerge: boolean;
}

interface MemoryCandidate {
  content: string;
  userId: string;
  chatId: string;
  metadata: {
    timestamp: Date;
    entities: string[];
    topics: string[];
    importance: number;
    messageCount: number;
  };
}

interface DeduplicationResult {
  action: 'insert' | 'skip' | 'merge' | 'update';
  memory?: any;
  relatedMemories?: any[];
  reason?: string;
}

export class MemoryDeduplicationService {
  private readonly DUPLICATE_THRESHOLD = 0.95; // Very similar - skip
  private readonly MERGE_THRESHOLD = 0.85;     // Similar enough to merge
  private readonly RELATED_THRESHOLD = 0.70;   // Related but distinct
  
  private openai: OpenAI;

  constructor(
    private contextManager: AdvancedContextManager
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Main entry point - processes memory with full deduplication pipeline
   */
  async processMemoryWithDeduplication(
    candidate: MemoryCandidate
  ): Promise<DeduplicationResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Starting memory deduplication for user:', candidate.userId);
      
      // 1. Generate embedding for the new memory
      const embedding = await this.generateEmbedding(candidate.content);
      console.log('📊 Generated embedding for content (length):', embedding.length);
      
      // 2. Search for similar existing memories
      const similarMemories = await this.findSimilarMemories(
        embedding,
        candidate.userId,
        candidate.chatId
      );
      
      console.log(`🔍 Found ${similarMemories.length} potentially similar memories`);
      
      // 3. Analyze similarity and decide action
      const analysis = this.analyzeSimilarity(candidate, similarMemories);
      console.log(`📋 Analysis result: ${analysis.action}`, {
        duplicates: analysis.duplicates?.length || 0,
        mergeCandidates: analysis.mergeCandidates?.length || 0,
        related: analysis.related?.length || 0
      });
      
      // 4. Execute the decided action
      const result = await this.executeAction(candidate, embedding, analysis);
      
      console.log(`✅ Memory deduplication completed in ${Date.now() - startTime}ms:`, result.action);
      return result;
      
    } catch (error) {
      console.error('❌ Memory deduplication failed:', error);
      
      // Fallback - insert as new memory
      return {
        action: 'insert',
        reason: `Deduplication failed: ${error.message}. Inserting as new memory.`
      };
    }
  }

  /**
   * Generate embedding using OpenAI's embedding model
   */
  private async generateEmbedding(content: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // Fast and cost-effective
        input: content.substring(0, 8000), // Truncate if too long
        encoding_format: 'float'
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Search for similar memories using vector similarity
   */
  private async findSimilarMemories(
    embedding: number[],
    userId: string,
    chatId?: string
  ): Promise<SimilarityResult[]> {
    try {
      // Get all memories for the user (we'll implement vector search later)
      const allMemories = await this.getAllUserMemories(userId);
      console.log(`📄 Retrieved ${allMemories.length} total memories for similarity check`);
      
      if (allMemories.length === 0) {
        return [];
      }
      
      // Calculate similarity scores
      const results: SimilarityResult[] = [];
      
      for (const memory of allMemories) {
        if (!memory.embedding) {
          // Skip memories without embeddings
          continue;
        }
        
        const similarity = this.cosineSimilarity(embedding, memory.embedding);
        
        results.push({
          memory,
          score: similarity,
          isDuplicate: similarity >= this.DUPLICATE_THRESHOLD,
          shouldMerge: similarity >= this.MERGE_THRESHOLD && similarity < this.DUPLICATE_THRESHOLD
        });
      }
      
      // Sort by similarity score (highest first)
      results.sort((a, b) => b.score - a.score);
      
      // Return only relevant results (above related threshold)
      return results.filter(r => r.score >= this.RELATED_THRESHOLD);
      
    } catch (error) {
      console.error('❌ Error finding similar memories:', error);
      return [];
    }
  }

  /**
   * Get all memories for a user (placeholder for vector database integration)
   */
  private async getAllUserMemories(userId: string): Promise<any[]> {
    try {
      // This is a placeholder - in production you'd use a vector database
      // For now, we'll check if context manager has any stored memories
      
      // Try to get memories from context manager
      // Note: This is a simplified approach until we integrate with Pinecone/Chroma
      const memories = [];
      
      console.log('📭 No existing memory retrieval method available yet');
      return memories;
      
    } catch (error) {
      console.error('❌ Error retrieving user memories:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Analyze similarity results and decide what action to take
   */
  private analyzeSimilarity(
    candidate: MemoryCandidate,
    similarMemories: SimilarityResult[]
  ): {
    action: 'insert' | 'skip' | 'merge' | 'update';
    duplicates?: any[];
    mergeCandidates?: any[];
    related?: any[];
    bestCandidate?: any;
  } {
    const duplicates = similarMemories
      .filter(r => r.isDuplicate)
      .map(r => r.memory);
    
    const mergeCandidates = similarMemories
      .filter(r => r.shouldMerge)
      .map(r => r.memory);
    
    const related = similarMemories
      .filter(r => !r.isDuplicate && !r.shouldMerge)
      .map(r => r.memory);

    // Check for exact duplicates first
    if (duplicates.length > 0) {
      const duplicate = duplicates[0];
      
      // Check if new memory has additional context
      if (this.hasAdditionalContext(candidate, duplicate)) {
        return {
          action: 'update',
          duplicates,
          bestCandidate: duplicate,
          related
        };
      }
      
      return {
        action: 'skip',
        duplicates,
        related
      };
    }

    // Check for merge candidates
    if (mergeCandidates.length > 0) {
      const bestCandidate = this.selectBestMergeCandidate(candidate, mergeCandidates);
      
      return {
        action: 'merge',
        mergeCandidates,
        bestCandidate,
        related
      };
    }

    // No duplicates or merge candidates - insert as new
    return {
      action: 'insert',
      related
    };
  }

  /**
   * Check if new memory has additional context compared to existing
   */
  private hasAdditionalContext(candidate: MemoryCandidate, existing: any): boolean {
    // Check content length
    if (candidate.content.length > existing.content.length * 1.2) {
      return true;
    }
    
    // Check entities
    const newEntities = new Set(candidate.metadata.entities);
    const existingEntities = new Set(existing.metadata?.entities || []);
    const hasNewEntities = [...newEntities].some(e => !existingEntities.has(e));
    
    // Check topics
    const newTopics = new Set(candidate.metadata.topics);
    const existingTopics = new Set(existing.metadata?.topics || []);
    const hasNewTopics = [...newTopics].some(t => !existingTopics.has(t));
    
    return hasNewEntities || hasNewTopics;
  }

  /**
   * Select the best candidate for merging
   */
  private selectBestMergeCandidate(
    candidate: MemoryCandidate,
    candidates: any[]
  ): any {
    // Score candidates based on multiple factors
    const scored = candidates.map(existing => {
      let score = 0;
      
      // Same conversation is preferred
      if (existing.chatId === candidate.chatId) score += 10;
      
      // Recent memories are preferred
      const ageDiff = Date.now() - new Date(existing.metadata?.timestamp || 0).getTime();
      const ageScore = Math.max(0, 10 - (ageDiff / (1000 * 60 * 60 * 24))); // Days
      score += ageScore;
      
      // Topic overlap
      const topicOverlap = this.calculateOverlap(
        existing.metadata?.topics || [],
        candidate.metadata.topics
      );
      score += topicOverlap * 5;
      
      // Entity overlap
      const entityOverlap = this.calculateOverlap(
        existing.metadata?.entities || [],
        candidate.metadata.entities
      );
      score += entityOverlap * 5;
      
      return { candidate: existing, score };
    });

    return scored.sort((a, b) => b.score - a.score)[0].candidate;
  }

  /**
   * Calculate overlap between two arrays
   */
  private calculateOverlap(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Execute the decided action
   */
  private async executeAction(
    candidate: MemoryCandidate,
    embedding: number[],
    analysis: any
  ): Promise<DeduplicationResult> {
    switch (analysis.action) {
      case 'skip':
        return {
          action: 'skip',
          relatedMemories: analysis.related,
          reason: `Found ${analysis.duplicates?.length || 0} duplicate memories`
        };

      case 'merge':
        const mergedMemory = await this.mergeMemories(
          candidate,
          analysis.bestCandidate,
          embedding
        );
        return {
          action: 'merge',
          memory: mergedMemory,
          relatedMemories: analysis.related,
          reason: `Merged with similar memory (${analysis.bestCandidate.id})`
        };

      case 'update':
        const updatedMemory = await this.updateMemory(
          analysis.bestCandidate,
          candidate,
          embedding
        );
        return {
          action: 'update',
          memory: updatedMemory,
          reason: `Updated existing memory with additional context`
        };

      case 'insert':
      default:
        const newMemory = await this.insertNewMemory(candidate, embedding);
        return {
          action: 'insert',
          memory: newMemory,
          relatedMemories: analysis.related,
          reason: 'No similar memories found - inserted as new'
        };
    }
  }

  /**
   * Merge two memories intelligently
   */
  private async mergeMemories(
    newMemory: MemoryCandidate,
    existingMemory: any,
    newEmbedding: number[]
  ): Promise<any> {
    // Merge content intelligently
    const mergedContent = this.mergeContent(existingMemory.content, newMemory.content);

    // Merge metadata
    const mergedMetadata = {
      ...existingMemory.metadata,
      entities: [...new Set([
        ...(existingMemory.metadata?.entities || []),
        ...newMemory.metadata.entities
      ])],
      topics: [...new Set([
        ...(existingMemory.metadata?.topics || []),
        ...newMemory.metadata.topics
      ])],
      lastUpdated: new Date(),
      updateCount: (existingMemory.metadata?.updateCount || 0) + 1,
      importance: Math.max(
        existingMemory.metadata?.importance || 0,
        newMemory.metadata.importance
      ),
      messageCount: (existingMemory.metadata?.messageCount || 0) + 1
    };

    // Average embeddings for better representation
    const mergedEmbedding = this.averageEmbeddings(
      existingMemory.embedding || newEmbedding,
      newEmbedding
    );

    const mergedMemory = {
      ...existingMemory,
      content: mergedContent,
      embedding: mergedEmbedding,
      metadata: mergedMetadata
    };

    console.log('🔄 Merged memory created:', {
      originalLength: existingMemory.content.length,
      newLength: mergedContent.length,
      entities: mergedMetadata.entities.length,
      topics: mergedMetadata.topics.length
    });

    // Here you would update in your vector store
    // await this.vectorStore.update(mergedMemory);

    return mergedMemory;
  }

  /**
   * Merge content intelligently
   */
  private mergeContent(existing: string, new_: string): string {
    // Simple merge strategy - can be enhanced with LLM
    if (existing.includes(new_)) {
      return existing; // New is subset of existing
    }
    
    if (new_.includes(existing)) {
      return new_; // Existing is subset of new
    }

    // No significant overlap - concatenate with separator
    return `${existing}\n\n[Additional Context]\n${new_}`;
  }

  /**
   * Average two embedding vectors
   */
  private averageEmbeddings(embedding1: number[], embedding2: number[]): number[] {
    return embedding1.map((val, idx) => (val + embedding2[idx]) / 2);
  }

  /**
   * Update existing memory with additional context
   */
  private async updateMemory(
    existingMemory: any,
    candidate: MemoryCandidate,
    embedding: number[]
  ): Promise<any> {
    const updatedMemory = {
      ...existingMemory,
      content: candidate.content, // Use new content (more comprehensive)
      embedding,
      metadata: {
        ...existingMemory.metadata,
        lastUpdated: new Date(),
        updateCount: (existingMemory.metadata?.updateCount || 0) + 1,
        entities: [...new Set([
          ...(existingMemory.metadata?.entities || []),
          ...candidate.metadata.entities
        ])],
        topics: [...new Set([
          ...(existingMemory.metadata?.topics || []),
          ...candidate.metadata.topics
        ])]
      }
    };

    console.log('📝 Memory updated with additional context');
    
    // Here you would update in your vector store
    // await this.vectorStore.update(updatedMemory);

    return updatedMemory;
  }

  /**
   * Insert new memory
   */
  private async insertNewMemory(
    candidate: MemoryCandidate,
    embedding: number[]
  ): Promise<any> {
    const newMemory = {
      id: this.generateId(),
      ...candidate,
      embedding,
      metadata: {
        ...candidate.metadata,
        createdAt: new Date(),
        updateCount: 0
      }
    };

    console.log('📝 New memory created:', {
      contentLength: newMemory.content.length,
      entities: newMemory.metadata.entities.length,
      topics: newMemory.metadata.topics.length
    });

    // Here you would insert into your vector store
    // await this.vectorStore.insert(newMemory);

    return newMemory;
  }

  /**
   * Generate unique ID for memory
   */
  private generateId(): string {
    return `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}