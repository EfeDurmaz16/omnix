/**
 * Comprehensive Type Definitions for Chat Import/Export System
 * Supports ChatGPT, Claude, Gemini, Copilot, and custom formats
 */

// Base conversation types
export interface BaseMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
  metadata?: Record<string, any>;
}

export interface BaseConversation {
  id?: string;
  title: string;
  messages: BaseMessage[];
  createdAt: Date | string;
  updatedAt: Date | string;
  metadata?: Record<string, any>;
}

// Platform-specific import formats
export interface ChatGPTExport {
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, {
    id: string;
    message?: {
      id: string;
      author: {
        role: 'user' | 'assistant' | 'system';
        name?: string;
      };
      create_time: number;
      content: {
        content_type: string;
        parts: string[];
      };
      metadata?: any;
    };
    parent?: string;
    children: string[];
  }>;
  moderation_results: any[];
  current_node: string;
  plugin_ids?: string[];
  conversation_id: string;
  conversation_template_id?: string;
  gizmo_id?: string;
  is_archived: boolean;
  safe_urls: string[];
}

export interface ClaudeExport {
  uuid: string;
  name: string;
  summary: string;
  model: string;
  created_at: string;
  updated_at: string;
  chat_messages: Array<{
    uuid: string;
    text: string;
    sender: 'human' | 'assistant';
    index: number;
    created_at: string;
    updated_at: string;
    edited_at?: string;
    chat_feedback?: any;
    attachments?: Array<{
      file_name: string;
      file_type: string;
      file_size: number;
      extracted_content?: string;
    }>;
  }>;
}

export interface GeminiExport {
  conversations: Array<{
    conversation: {
      id: string;
      create_time: string;
      update_time: string;
    };
    turns: Array<{
      user_input: {
        input_text: string;
      };
      model_output: {
        output_text: string;
      };
      turn_id: string;
      create_time: string;
    }>;
  }>;
}

export interface CopilotExport {
  chats: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: string;
      messageType?: string;
      suggestions?: string[];
      citations?: Array<{
        title: string;
        url: string;
        snippet: string;
      }>;
    }>;
  }>;
}

// Export format types
export interface ExportOptions {
  format: 'json' | 'markdown' | 'csv' | 'pdf';
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  includeAttachments?: boolean;
  conversationIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  compression?: boolean;
}

export interface JSONExport {
  exportedAt: string;
  platform: string;
  version: string;
  conversations: BaseConversation[];
  totalConversations: number;
  totalMessages: number;
  metadata?: {
    user?: {
      id: string;
      email?: string;
      name?: string;
    };
    exportOptions: ExportOptions;
  };
}

export interface MarkdownExport {
  content: string;
  metadata: {
    title: string;
    exportedAt: string;
    totalConversations: number;
    totalMessages: number;
  };
}

export interface CSVRow {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  role: string;
  content: string;
  timestamp: string;
  createdAt: string;
  model?: string;
  tokens?: number;
  cost?: number;
}

export interface PDFExportOptions extends ExportOptions {
  includeToc?: boolean;
  pageBreakBetweenConversations?: boolean;
  theme?: 'light' | 'dark' | 'print';
  fontSize?: number;
  fontFamily?: string;
}

// Import/processing types
export interface ImportResult {
  success: boolean;
  conversationsImported: number;
  messagesImported: number;
  errors: string[];
  warnings: string[];
  skipped: string[];
  conversationIds: string[];
  processingTime: number;
}

export interface ImportOptions {
  mergeExisting?: boolean;
  validateContent?: boolean;
  preserveIds?: boolean;
  skipDuplicates?: boolean;
  maxConversations?: number;
  maxMessages?: number;
  sanitizeContent?: boolean;
}

export interface FileProcessingStatus {
  id: string;
  filename: string;
  size: number;
  format: string;
  status: 'uploading' | 'processing' | 'validating' | 'importing' | 'completed' | 'error';
  progress: number;
  message?: string;
  result?: ImportResult;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: {
    conversationIndex?: number;
    messageIndex?: number;
    line?: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    oldestConversation?: Date;
    newestConversation?: Date;
  };
}

// Conversion types
export interface ConversionRequest {
  sourceFormat: 'chatgpt' | 'claude' | 'gemini' | 'copilot' | 'json';
  targetFormat: 'json' | 'markdown' | 'csv' | 'pdf';
  data: any;
  options?: ExportOptions & ImportOptions;
}

export interface ConversionResult {
  success: boolean;
  data?: any;
  filename?: string;
  size?: number;
  error?: string;
  processingTime: number;
}

// Batch operation types
export interface BatchOperation {
  id: string;
  type: 'import' | 'export' | 'convert';
  files: string[];
  options: ImportOptions | ExportOptions;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  results: Array<ImportResult | ConversionResult>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// Platform detection types
export interface PlatformDetectionResult {
  platform: 'chatgpt' | 'claude' | 'gemini' | 'copilot' | 'unknown';
  confidence: number;
  version?: string;
  characteristics: string[];
  suggestions?: string[];
}

// Statistics and analytics types
export interface ImportExportStats {
  totalImports: number;
  totalExports: number;
  conversationsImported: number;
  conversationsExported: number;
  popularFormats: Array<{
    format: string;
    count: number;
    percentage: number;
  }>;
  averageFileSize: number;
  averageProcessingTime: number;
  errorRate: number;
  lastActivity: Date;
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ImportResponse extends APIResponse<ImportResult> {
  processingId?: string;
}

export interface ExportResponse extends APIResponse {
  downloadUrl?: string;
  filename?: string;
  size?: number;
  expiresAt?: Date;
}

// Utility types
export type SupportedImportFormat = 'chatgpt' | 'claude' | 'gemini' | 'copilot' | 'json';
export type SupportedExportFormat = 'json' | 'markdown' | 'csv' | 'pdf';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';

// Type guards
export function isChatGPTExport(data: any): data is ChatGPTExport {
  return data && 
    typeof data.title === 'string' &&
    typeof data.mapping === 'object' &&
    typeof data.conversation_id === 'string';
}

export function isClaudeExport(data: any): data is ClaudeExport {
  return data && 
    typeof data.uuid === 'string' &&
    Array.isArray(data.chat_messages) &&
    data.chat_messages.every((msg: any) => 
      typeof msg.text === 'string' && 
      ['human', 'assistant'].includes(msg.sender)
    );
}

export function isGeminiExport(data: any): data is GeminiExport {
  return data && 
    Array.isArray(data.conversations) &&
    data.conversations.every((conv: any) => 
      conv.conversation && 
      Array.isArray(conv.turns)
    );
}

export function isCopilotExport(data: any): data is CopilotExport {
  return data && 
    Array.isArray(data.chats) &&
    data.chats.every((chat: any) => 
      typeof chat.id === 'string' && 
      Array.isArray(chat.messages)
    );
}