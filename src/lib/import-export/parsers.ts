/**
 * Format Parsers for Chat Import/Export System
 * Handles ChatGPT, Claude, Gemini, Copilot, and custom formats
 */

import {
  BaseConversation,
  BaseMessage,
  ChatGPTExport,
  ClaudeExport,
  GeminiExport,
  CopilotExport,
  ImportResult,
  ImportOptions,
  ValidationResult,
  ValidationError,
  PlatformDetectionResult,
  isChatGPTExport,
  isClaudeExport,
  isGeminiExport,
  isCopilotExport,
  SupportedImportFormat
} from '@/types/import-export';

export class ChatImportParser {
  private options: ImportOptions;

  constructor(options: ImportOptions = {}) {
    this.options = {
      validateContent: true,
      sanitizeContent: true,
      skipDuplicates: false,
      maxConversations: 1000,
      maxMessages: 10000,
      ...options
    };
  }

  /**
   * Detect the platform format from file content
   */
  detectPlatform(data: any): PlatformDetectionResult {
    const characteristics: string[] = [];
    let platform: PlatformDetectionResult['platform'] = 'unknown';
    let confidence = 0;

    try {
      // ChatGPT detection
      if (isChatGPTExport(data)) {
        platform = 'chatgpt';
        confidence = 0.95;
        characteristics.push('Has mapping structure', 'Has conversation_id', 'Has create_time/update_time');
        
        if (data.plugin_ids) characteristics.push('Has plugin support');
        if (data.gizmo_id) characteristics.push('Has custom GPT support');
        
        return { platform, confidence, characteristics };
      }

      // Claude detection
      if (isClaudeExport(data)) {
        platform = 'claude';
        confidence = 0.95;
        characteristics.push('Has chat_messages array', 'Has sender field', 'Has uuid fields');
        
        if (data.model) characteristics.push(`Model: ${data.model}`);
        if (data.summary) characteristics.push('Has conversation summary');
        
        return { platform, confidence, characteristics };
      }

      // Gemini detection
      if (isGeminiExport(data)) {
        platform = 'gemini';
        confidence = 0.95;
        characteristics.push('Has conversations array', 'Has turns structure', 'Has user_input/model_output');
        
        return { platform, confidence, characteristics };
      }

      // Copilot detection
      if (isCopilotExport(data)) {
        platform = 'copilot';
        confidence = 0.95;
        characteristics.push('Has chats array', 'Has messages with citations', 'Has suggestions');
        
        return { platform, confidence, characteristics };
      }

      // Partial detection attempts
      if (data && typeof data === 'object') {
        // Check for common ChatGPT patterns
        if (data.mapping || data.conversation_id) {
          platform = 'chatgpt';
          confidence = 0.7;
          characteristics.push('Partial ChatGPT structure detected');
        }
        // Check for Claude patterns
        else if (data.chat_messages || data.uuid) {
          platform = 'claude';
          confidence = 0.7;
          characteristics.push('Partial Claude structure detected');
        }
        // Check for Gemini patterns
        else if (data.conversations && Array.isArray(data.conversations)) {
          platform = 'gemini';
          confidence = 0.6;
          characteristics.push('Conversations array found');
        }
        // Check for generic chat structure
        else if (data.chats || data.messages) {
          confidence = 0.3;
          characteristics.push('Generic chat structure');
        }
      }

    } catch (error) {
      console.warn('Platform detection error:', error);
    }

    return {
      platform,
      confidence,
      characteristics,
      suggestions: confidence < 0.8 ? [
        'Verify file format and content',
        'Check if file is corrupted or incomplete',
        'Ensure file is from a supported platform'
      ] : undefined
    };
  }

  /**
   * Parse data based on detected or specified format
   */
  async parseImport(data: any, format?: SupportedImportFormat): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      success: false,
      conversationsImported: 0,
      messagesImported: 0,
      errors: [],
      warnings: [],
      skipped: [],
      conversationIds: [],
      processingTime: 0
    };

    try {
      // Detect platform if not specified
      if (!format) {
        const detection = this.detectPlatform(data);
        if (detection.confidence < 0.7) {
          result.errors.push(`Cannot reliably detect platform format. Confidence: ${detection.confidence}`);
          return result;
        }
        format = detection.platform as SupportedImportFormat;
      }

      // Validate data
      if (this.options.validateContent) {
        const validation = this.validateData(data, format);
        if (!validation.isValid) {
          result.errors.push(...validation.errors.map(e => e.message));
          result.warnings.push(...validation.warnings.map(w => w.message));
          
          if (validation.errors.length > 0) {
            return result;
          }
        }
      }

      // Parse based on format
      let conversations: BaseConversation[] = [];
      
      switch (format) {
        case 'chatgpt':
          conversations = this.parseChatGPT(data as ChatGPTExport);
          break;
        case 'claude':
          conversations = this.parseClaude(data as ClaudeExport);
          break;
        case 'gemini':
          conversations = this.parseGemini(data as GeminiExport);
          break;
        case 'copilot':
          conversations = this.parseCopilot(data as CopilotExport);
          break;
        case 'json':
          conversations = this.parseJSON(data);
          break;
        default:
          result.errors.push(`Unsupported format: ${format}`);
          return result;
      }

      // Apply limits and filters
      if (this.options.maxConversations && conversations.length > this.options.maxConversations) {
        const truncated = conversations.length - this.options.maxConversations;
        conversations = conversations.slice(0, this.options.maxConversations);
        result.warnings.push(`Truncated ${truncated} conversations due to limit`);
      }

      // Count messages and apply message limits
      let totalMessages = 0;
      for (const conv of conversations) {
        if (this.options.maxMessages && totalMessages + conv.messages.length > this.options.maxMessages) {
          const remaining = this.options.maxMessages - totalMessages;
          conv.messages = conv.messages.slice(0, remaining);
          result.warnings.push(`Truncated messages in conversation "${conv.title}" due to limit`);
          break;
        }
        totalMessages += conv.messages.length;
      }

      // Sanitize content if requested
      if (this.options.sanitizeContent) {
        conversations = this.sanitizeConversations(conversations);
      }

      result.success = true;
      result.conversationsImported = conversations.length;
      result.messagesImported = totalMessages;
      result.conversationIds = conversations.map(c => c.id || `imported_${Date.now()}_${Math.random()}`);
      
    } catch (error) {
      console.error('Import parsing error:', error);
      result.errors.push(`Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Parse ChatGPT export format
   */
  private parseChatGPT(data: ChatGPTExport): BaseConversation[] {
    const conversation: BaseConversation = {
      id: data.conversation_id,
      title: data.title || 'Untitled Conversation',
      messages: [],
      createdAt: new Date(data.create_time * 1000),
      updatedAt: new Date(data.update_time * 1000),
      metadata: {
        platform: 'chatgpt',
        isArchived: data.is_archived,
        pluginIds: data.plugin_ids,
        gizmoId: data.gizmo_id
      }
    };

    // Build message tree from mapping
    const messages: BaseMessage[] = [];
    const visited = new Set<string>();

    const buildMessageChain = (nodeId: string) => {
      if (visited.has(nodeId) || !data.mapping[nodeId]) return;
      
      visited.add(nodeId);
      const node = data.mapping[nodeId];
      
      if (node.message) {
        const msg = node.message;
        messages.push({
          id: msg.id,
          role: msg.author.role,
          content: msg.content.parts.join('\n'),
          timestamp: new Date(msg.create_time * 1000),
          metadata: {
            author: msg.author.name,
            contentType: msg.content.content_type,
            nodeId: nodeId
          }
        });
      }

      // Process children
      node.children.forEach(childId => buildMessageChain(childId));
    };

    // Start from root nodes (nodes without parents)
    Object.entries(data.mapping).forEach(([nodeId, node]) => {
      if (!node.parent) {
        buildMessageChain(nodeId);
      }
    });

    // Sort messages by timestamp
    conversation.messages = messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return [conversation];
  }

  /**
   * Parse Claude export format
   */
  private parseClaude(data: ClaudeExport): BaseConversation[] {
    const conversation: BaseConversation = {
      id: data.uuid,
      title: data.name || 'Untitled Conversation',
      messages: data.chat_messages.map(msg => ({
        id: msg.uuid,
        role: msg.sender === 'human' ? 'user' : 'assistant',
        content: msg.text,
        timestamp: new Date(msg.created_at),
        metadata: {
          platform: 'claude',
          index: msg.index,
          editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
          feedback: msg.chat_feedback,
          attachments: msg.attachments
        }
      })),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      metadata: {
        platform: 'claude',
        model: data.model,
        summary: data.summary
      }
    };

    return [conversation];
  }

  /**
   * Parse Gemini export format
   */
  private parseGemini(data: GeminiExport): BaseConversation[] {
    return data.conversations.map(conv => {
      const conversation: BaseConversation = {
        id: conv.conversation.id,
        title: `Gemini Conversation ${conv.conversation.id.slice(-8)}`,
        messages: [],
        createdAt: new Date(conv.conversation.create_time),
        updatedAt: new Date(conv.conversation.update_time),
        metadata: {
          platform: 'gemini'
        }
      };

      // Convert turns to messages
      conv.turns.forEach(turn => {
        // User message
        conversation.messages.push({
          id: `${turn.turn_id}_user`,
          role: 'user',
          content: turn.user_input.input_text,
          timestamp: new Date(turn.create_time),
          metadata: {
            platform: 'gemini',
            turnId: turn.turn_id
          }
        });

        // Assistant message
        conversation.messages.push({
          id: `${turn.turn_id}_assistant`,
          role: 'assistant',
          content: turn.model_output.output_text,
          timestamp: new Date(turn.create_time),
          metadata: {
            platform: 'gemini',
            turnId: turn.turn_id
          }
        });
      });

      return conversation;
    });
  }

  /**
   * Parse Copilot export format
   */
  private parseCopilot(data: CopilotExport): BaseConversation[] {
    return data.chats.map(chat => ({
      id: chat.id,
      title: chat.title || 'Untitled Conversation',
      messages: chat.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        metadata: {
          platform: 'copilot',
          messageType: msg.messageType,
          suggestions: msg.suggestions,
          citations: msg.citations
        }
      })),
      createdAt: new Date(chat.createdAt),
      updatedAt: new Date(chat.updatedAt),
      metadata: {
        platform: 'copilot'
      }
    }));
  }

  /**
   * Parse generic JSON format
   */
  private parseJSON(data: any): BaseConversation[] {
    if (Array.isArray(data)) {
      return data.map(this.normalizeConversation);
    } else if (data.conversations && Array.isArray(data.conversations)) {
      return data.conversations.map(this.normalizeConversation);
    } else if (data.messages) {
      // Single conversation with messages
      return [this.normalizeConversation(data)];
    }
    
    throw new Error('Invalid JSON format: Expected conversations array or single conversation object');
  }

  /**
   * Normalize conversation object to BaseConversation
   */
  private normalizeConversation(conv: any): BaseConversation {
    return {
      id: conv.id || `imported_${Date.now()}_${Math.random()}`,
      title: conv.title || conv.name || 'Imported Conversation',
      messages: (conv.messages || []).map((msg: any) => ({
        id: msg.id || `msg_${Date.now()}_${Math.random()}`,
        role: msg.role || (msg.sender === 'human' ? 'user' : 'assistant'),
        content: msg.content || msg.text || '',
        timestamp: new Date(msg.timestamp || msg.created_at || msg.create_time || Date.now()),
        metadata: msg.metadata || {}
      })),
      createdAt: new Date(conv.createdAt || conv.created_at || conv.create_time || Date.now()),
      updatedAt: new Date(conv.updatedAt || conv.updated_at || conv.update_time || Date.now()),
      metadata: conv.metadata || {}
    };
  }

  /**
   * Validate imported data
   */
  private validateData(data: any, format: SupportedImportFormat): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const stats = {
      totalConversations: 0,
      totalMessages: 0,
      averageMessagesPerConversation: 0,
      oldestConversation: undefined as Date | undefined,
      newestConversation: undefined as Date | undefined
    };

    // Basic structure validation
    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'root',
        message: 'Invalid data: Expected object',
        severity: 'error'
      });
      return { isValid: false, errors, warnings, stats };
    }

    // Format-specific validation
    try {
      switch (format) {
        case 'chatgpt':
          this.validateChatGPT(data, errors, warnings);
          break;
        case 'claude':
          this.validateClaude(data, errors, warnings);
          break;
        case 'gemini':
          this.validateGemini(data, errors, warnings);
          break;
        case 'copilot':
          this.validateCopilot(data, errors, warnings);
          break;
      }
    } catch (error) {
      errors.push({
        field: 'validation',
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats
    };
  }

  private validateChatGPT(data: any, errors: ValidationError[], warnings: ValidationError[]) {
    if (!data.mapping || typeof data.mapping !== 'object') {
      errors.push({
        field: 'mapping',
        message: 'Missing or invalid mapping object',
        severity: 'error'
      });
    }

    if (!data.conversation_id) {
      errors.push({
        field: 'conversation_id',
        message: 'Missing conversation ID',
        severity: 'error'
      });
    }
  }

  private validateClaude(data: any, errors: ValidationError[], warnings: ValidationError[]) {
    if (!Array.isArray(data.chat_messages)) {
      errors.push({
        field: 'chat_messages',
        message: 'Missing or invalid chat_messages array',
        severity: 'error'
      });
    }

    if (!data.uuid) {
      warnings.push({
        field: 'uuid',
        message: 'Missing conversation UUID',
        severity: 'warning'
      });
    }
  }

  private validateGemini(data: any, errors: ValidationError[], warnings: ValidationError[]) {
    if (!Array.isArray(data.conversations)) {
      errors.push({
        field: 'conversations',
        message: 'Missing or invalid conversations array',
        severity: 'error'
      });
    }
  }

  private validateCopilot(data: any, errors: ValidationError[], warnings: ValidationError[]) {
    if (!Array.isArray(data.chats)) {
      errors.push({
        field: 'chats',
        message: 'Missing or invalid chats array',
        severity: 'error'
      });
    }
  }

  /**
   * Sanitize conversation content
   */
  private sanitizeConversations(conversations: BaseConversation[]): BaseConversation[] {
    return conversations.map(conv => ({
      ...conv,
      title: this.sanitizeText(conv.title),
      messages: conv.messages.map(msg => ({
        ...msg,
        content: this.sanitizeText(msg.content)
      }))
    }));
  }

  /**
   * Sanitize text content
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    // Remove potentially harmful scripts and HTML
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}