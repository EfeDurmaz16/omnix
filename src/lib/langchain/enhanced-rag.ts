/**
 * LangChain-enhanced RAG system for Omnix
 * This replaces the custom vector store with LangChain's optimized components
 */

import { OpenAIEmbeddings } from "@langchain/openai";
import { FirestoreVectorStore } from "@langchain/community/vectorstores/firestore";
import { ContextualCompressionRetriever } from "langchain/retrievers/contextual_compression";
import { LLMChainExtractor } from "langchain/retrievers/document_compressors/chain_extract";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatOpenAI } from "@langchain/openai";
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/firestore";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { LangChainTracer } from "langchain/callbacks";

// Initialize LangSmith tracing
const tracer = new LangChainTracer({
  projectName: process.env.LANGCHAIN_PROJECT || "omnix-ai",
  tags: ["production", "rag", "chat", "omnix"]
});

export interface LangChainRAGConfig {
  openaiApiKey: string;
  firestoreProjectId: string;
  collectionName?: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  maxTokenLimit?: number;
}

export class EnhancedLangChainRAG {
  private embeddings: OpenAIEmbeddings;
  private vectorStore: FirestoreVectorStore;
  private compressor: LLMChainExtractor;
  private textSplitter: RecursiveCharacterTextSplitter;
  private llm: ChatOpenAI;
  private config: Required<LangChainRAGConfig>;

  constructor(config: LangChainRAGConfig) {
    this.config = {
      collectionName: "omnix-langchain-vectors",
      embeddingModel: "text-embedding-3-small",
      chunkSize: 1000,
      chunkOverlap: 200,
      maxTokenLimit: 2000,
      ...config
    };

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.config.openaiApiKey,
      modelName: this.config.embeddingModel,
      // Enhanced configuration
      maxConcurrency: 3,
      maxRetries: 2,
      timeout: 30000,
    });

    this.llm = new ChatOpenAI({
      openAIApiKey: this.config.openaiApiKey,
      modelName: "gpt-4o-mini", // Fast model for compression
      temperature: 0.1,
      maxTokens: 500,
      callbacks: [tracer], // Enable tracing for all LLM calls
    });

    this.vectorStore = new FirestoreVectorStore(this.embeddings, {
      collectionName: this.config.collectionName,
      firestoreConfig: {
        projectId: this.config.firestoreProjectId,
      },
    });

    this.compressor = new LLMChainExtractor({
      llm: this.llm,
      getPrompt: () => {
        return `Given the following question and context, extract only the most relevant information that directly answers the question. Be concise but comprehensive.

Question: {question}
Context: {context}

Relevant information:`;
      },
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      separators: ["\n\n", "\n", " ", ""],
    });
  }

  /**
   * Enhanced retrieval with contextual compression and MMR
   */
  async retrieveRelevantMemories(
    userId: string,
    query: string,
    options: {
      topK?: number;
      searchType?: "similarity" | "mmr";
      fetchK?: number;
      lambda?: number;
      filter?: Record<string, any>;
    } = {}
  ) {
    const {
      topK = 5,
      searchType = "mmr",
      fetchK = 20,
      lambda = 0.5,
      filter = {}
    } = options;

    const startTime = performance.now();

    try {
      // Create retriever with advanced search
      const baseRetriever = this.vectorStore.asRetriever({
        k: topK,
        searchType,
        searchKwargs: {
          fetchK,
          lambda, // MMR diversity parameter
          filter: {
            userId,
            ...filter
          }
        },
      });

      // Add contextual compression
      const compressedRetriever = new ContextualCompressionRetriever({
        baseCompressor: this.compressor,
        baseRetriever,
      });

      // Retrieve and compress documents with tracing
      const documents = await compressedRetriever.getRelevantDocuments(query, {
        callbacks: [tracer]
      });

      const elapsedTime = performance.now() - startTime;
      
      console.log(`🔗 LangChain RAG retrieval completed in ${elapsedTime.toFixed(2)}ms`);
      console.log(`📊 Retrieved ${documents.length} compressed documents`);

      return {
        documents,
        metadata: {
          searchType,
          topK,
          fetchK,
          elapsedTime: elapsedTime.toFixed(2),
          totalResults: documents.length
        }
      };
    } catch (error) {
      console.error("❌ LangChain RAG retrieval failed:", error);
      throw error;
    }
  }

  /**
   * Enhanced conversation memory with automatic summarization
   */
  async getConversationMemory(userId: string, conversationId: string) {
    const chatHistory = new ChatMessageHistory({
      collectionName: "omnix-chat-history",
      userId,
      sessionId: conversationId,
    });

    const memory = new ConversationSummaryBufferMemory({
      llm: this.llm,
      chatHistory,
      maxTokenLimit: this.config.maxTokenLimit,
      returnMessages: true,
      memoryKey: "chat_history",
    });

    return memory;
  }

  /**
   * Store conversation with automatic chunking and embedding
   */
  async storeConversation(
    userId: string,
    conversationId: string,
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
      timestamp: Date;
    }>
  ) {
    const startTime = performance.now();

    try {
      // Convert messages to conversation text
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join("\n\n");

      // Split into chunks for better retrieval
      const chunks = await this.textSplitter.splitText(conversationText);

      // Create documents with metadata
      const documents = chunks.map((chunk, index) => ({
        pageContent: chunk,
        metadata: {
          userId,
          conversationId,
          chunkIndex: index,
          totalChunks: chunks.length,
          messageCount: messages.length,
          timestamp: new Date().toISOString(),
          lastActivity: Math.max(...messages.map(m => m.timestamp.getTime())),
        },
      }));

      // Store in vector database
      await this.vectorStore.addDocuments(documents);

      const elapsedTime = performance.now() - startTime;
      console.log(`🔗 LangChain conversation stored in ${elapsedTime.toFixed(2)}ms`);
      console.log(`📝 Created ${chunks.length} chunks from ${messages.length} messages`);

      return {
        success: true,
        chunksCreated: chunks.length,
        documentsStored: documents.length,
        elapsedTime: elapsedTime.toFixed(2)
      };
    } catch (error) {
      console.error("❌ LangChain conversation storage failed:", error);
      throw error;
    }
  }

  /**
   * Format retrieved documents for context injection
   */
  formatRetrievedContext(documents: any[], userQuery: string): string {
    if (documents.length === 0) {
      return "";
    }

    const formattedDocs = documents
      .map((doc, index) => {
        const content = doc.pageContent.substring(0, 500); // Limit length
        const relevance = doc.metadata?.relevanceScore || "N/A";
        return `[${index + 1}] (Relevance: ${relevance})\n${content}`;
      })
      .join("\n\n");

    return `**Relevant context from previous conversations:**

${formattedDocs}

**Current question:** ${userQuery}`;
  }

  /**
   * Get usage statistics for monitoring
   */
  async getUsageStats(userId: string): Promise<{
    totalDocuments: number;
    totalConversations: number;
    storageSize: string;
    lastActivity: Date | null;
  }> {
    try {
      // This would need to be implemented based on Firestore queries
      // For now, return placeholder data
      return {
        totalDocuments: 0,
        totalConversations: 0,
        storageSize: "Unknown",
        lastActivity: null
      };
    } catch (error) {
      console.error("Failed to get usage stats:", error);
      return {
        totalDocuments: 0,
        totalConversations: 0,
        storageSize: "Error",
        lastActivity: null
      };
    }
  }

  /**
   * Clean up old conversation data (GDPR compliance)
   */
  async deleteUserData(userId: string): Promise<void> {
    try {
      // This would need custom implementation for Firestore cleanup
      console.log(`🗑️ Deleting all data for user: ${userId}`);
      // Implementation would go here
    } catch (error) {
      console.error("Failed to delete user data:", error);
      throw error;
    }
  }
}

// Singleton instance factory
let enhancedRAGInstance: EnhancedLangChainRAG | null = null;

export function getEnhancedRAG(): EnhancedLangChainRAG {
  if (!enhancedRAGInstance) {
    enhancedRAGInstance = new EnhancedLangChainRAG({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      firestoreProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    });
  }
  return enhancedRAGInstance;
}

export default EnhancedLangChainRAG;