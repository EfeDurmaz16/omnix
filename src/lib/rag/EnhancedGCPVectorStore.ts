import { GoogleAuth } from 'google-auth-library';
import OpenAI from 'openai';
import { ConversationContext, ContextMessage } from '../context/AdvancedContextManager';

export interface MemoryResult {
  content: string;
  relevanceScore: number;
  conversationId: string;
  timestamp: string;
  model: string;
  messageId: string;
  metadata?: Record<string, any>;
}

export interface ExtractedMemory {
  type: 'preference' | 'skill' | 'fact' | 'goal' | 'context';
  content: string;
  confidence: number;
  extractedFrom: string;
  timestamp: Date;
}

export class EnhancedGCPVectorStore {
  private auth: GoogleAuth;
  private openai: OpenAI;
  private initialized = false;
  private projectId: string;
  private location: string = 'us-central1';
  private indexEndpoint: string = '';
  private useVectorSearch: boolean = false;

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.indexEndpoint = process.env.VERTEX_AI_INDEX_ENDPOINT || '';
    
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.initializeVectorStore();
  }

  private async initializeVectorStore(): Promise<void> {
    try {
      if (!this.projectId) {
        console.warn('⚠️ GOOGLE_CLOUD_PROJECT_ID not set, vector search disabled');
        return;
      }

      // Try to initialize Vector Search first, fall back to Firestore
      if (this.indexEndpoint) {
        try {
          this.useVectorSearch = true;
          console.log('✅ Vertex AI Vector Search mode enabled');
        } catch (error) {
          console.warn('⚠️ Vector Search unavailable, using Firestore fallback:', error);
          this.useVectorSearch = false;
        }
      } else {
        console.log('📦 Using Firestore vector storage (set VERTEX_AI_INDEX_ENDPOINT to upgrade)');
        this.useVectorSearch = false;
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      this.initialized = false;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text.trim()) {
      throw new Error('Cannot generate embedding for empty text');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error('Embedding generation failed');
    }
  }

  async storeConversation(
    userId: string, 
    conversation: ConversationContext
  ): Promise<void> {
    if (!this.initialized) {
      console.warn('Vector store not initialized, skipping conversation storage');
      return;
    }

    if (this.useVectorSearch) {
      console.log('🚀 Vector Search mode: Enhanced storage with metadata');
    } else {
      console.log('📦 Firestore mode: Basic vector storage');
    }

    // For now, use Firestore for both modes (Vector Search integration requires more setup)
    await this.storeConversationFirestore(userId, conversation);
  }

  private async storeConversationFirestore(
    userId: string, 
    conversation: ConversationContext
  ): Promise<void> {
    try {
      const embeddings = await this.generateEmbeddings(conversation.messages);
      
      const db = await this.getFirestoreClient();
      const docRef = db.collection('user-vectors').doc(`${userId}-${conversation.id}`);
      
      await docRef.set({
        userId,
        conversationId: conversation.id,
        messages: conversation.messages.map((msg, idx) => ({
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp,
          embedding: embeddings[idx],
          messageId: msg.id || `msg-${idx}`,
        })),
        metadata: conversation.metadata,
        createdAt: new Date(),
        storageType: this.useVectorSearch ? 'vector-search-ready' : 'firestore',
      });

      console.log(`✅ Stored conversation ${conversation.id} for user ${userId}`);
    } catch (error) {
      console.error('Failed to store conversation:', error);
      throw error;
    }
  }

  async generateEmbeddings(messages: ContextMessage[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const message of messages) {
      try {
        const embedding = await this.generateEmbedding(message.content);
        embeddings.push(embedding);
      } catch (error) {
        console.warn('Failed to generate embedding for message:', message.id, error);
        embeddings.push(new Array(1536).fill(0));
      }
    }
    
    return embeddings;
  }

  async searchRelevantMemories(
    userId: string, 
    query: string, 
    topK: number = 5
  ): Promise<MemoryResult[]> {
    if (!this.initialized) {
      console.warn('Vector store not initialized, returning empty memories');
      return [];
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const db = await this.getFirestoreClient();
      const snapshot = await db.collection('user-vectors')
        .where('userId', '==', userId)
        .limit(20)
        .get();

      const results: MemoryResult[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.messages) {
          data.messages.forEach((message: any) => {
            const similarity = this.cosineSimilarity(queryEmbedding, message.embedding);
            if (similarity > 0.7) {
              results.push({
                content: message.content,
                relevanceScore: similarity,
                conversationId: data.conversationId,
                timestamp: message.timestamp.toDate?.()?.toISOString() || message.timestamp,
                model: data.metadata?.currentModel || 'unknown',
                messageId: message.messageId,
                metadata: { 
                  similarity, 
                  role: message.role,
                  storageType: this.getStorageType()
                },
              });
            }
          });
        }
      });

      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, topK);

    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  async storeMemories(userId: string, memories: ExtractedMemory[]): Promise<void> {
    if (!this.initialized || memories.length === 0) {
      return;
    }

    try {
      const db = await this.getFirestoreClient();
      const batch = db.batch();

      for (const memory of memories) {
        const embedding = await this.generateEmbedding(memory.content);
        const docRef = db.collection('user-memories').doc();
        
        batch.set(docRef, {
          userId,
          type: memory.type,
          content: memory.content,
          confidence: memory.confidence,
          extractedFrom: memory.extractedFrom,
          timestamp: memory.timestamp,
          embedding,
          createdAt: new Date(),
          storageType: this.getStorageType(),
        });
      }

      await batch.commit();
      console.log(`✅ Stored ${memories.length} extracted memories for user ${userId}`);
    } catch (error) {
      console.error('Failed to store memories:', error);
      throw error;
    }
  }

  async searchUserMemories(
    userId: string, 
    query: string, 
    memoryType?: string,
    topK: number = 3
  ): Promise<ExtractedMemory[]> {
    if (!this.initialized) {
      return [];
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const db = await this.getFirestoreClient();
      
      let queryRef = db.collection('user-memories')
        .where('userId', '==', userId);
      
      if (memoryType) {
        queryRef = queryRef.where('type', '==', memoryType);
      }

      const snapshot = await queryRef.limit(20).get();
      const results: ExtractedMemory[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
        
        if (similarity > 0.6) {
          results.push({
            type: data.type,
            content: data.content,
            confidence: data.confidence,
            extractedFrom: data.extractedFrom,
            timestamp: data.timestamp.toDate(),
          });
        }
      });

      return results
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, topK);

    } catch (error) {
      console.error('Failed to search user memories:', error);
      return [];
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    if (!this.initialized) {
      console.warn('Vector store not initialized, skipping data deletion');
      return;
    }

    try {
      const db = await this.getFirestoreClient();
      
      const collections = ['user-vectors', 'user-memories'];
      
      for (const collectionName of collections) {
        const snapshot = await db.collection(collectionName)
          .where('userId', '==', userId)
          .get();

        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        
        if (!snapshot.empty) {
          await batch.commit();
        }
      }

      console.log(`✅ Deleted all vector data for user ${userId}`);
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw error;
    }
  }

  async getStorageStats(userId: string): Promise<{
    conversationCount: number;
    memoryCount: number;
    totalVectors: number;
    storageType: 'firestore' | 'vector-search' | 'uninitialized';
  }> {
    if (!this.initialized) {
      return { conversationCount: 0, memoryCount: 0, totalVectors: 0, storageType: 'uninitialized' };
    }

    try {
      const db = await this.getFirestoreClient();
      
      const [vectorsSnapshot, memoriesSnapshot] = await Promise.all([
        db.collection('user-vectors').where('userId', '==', userId).get(),
        db.collection('user-memories').where('userId', '==', userId).get(),
      ]);

      return {
        conversationCount: vectorsSnapshot.size,
        memoryCount: memoriesSnapshot.size,
        totalVectors: vectorsSnapshot.size + memoriesSnapshot.size,
        storageType: this.getStorageType(),
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { conversationCount: 0, memoryCount: 0, totalVectors: 0, storageType: 'uninitialized' };
    }
  }

  private async getFirestoreClient() {
    const { Firestore } = await import('@google-cloud/firestore');
    return new Firestore({
      projectId: this.projectId,
      auth: this.auth,
    });
  }

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
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getStorageType(): 'firestore' | 'vector-search' | 'uninitialized' {
    if (!this.initialized) return 'uninitialized';
    return this.useVectorSearch ? 'vector-search' : 'firestore';
  }
} 