/**
 * Integration service for import/export system
 * Provides high-level functions that integrate with existing database and context management
 */

import { contextManager } from '@/lib/context/AdvancedContextManager';
import { conversationStore } from '@/lib/database/ConversationStore';
import { ImportParsers } from './parsers';
import { ExportFormatters } from './formatters';
import { ImportValidator } from './validation';
import {
  BaseConversation,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
  SupportedPlatform,
  ExportFormat,
  PrivacySettings,
  ProcessingStats
} from '@/types/import-export';

export class ImportExportService {
  /**
   * Import conversations from external platform data
   */
  static async importConversations(
    userId: string,
    fileContent: string,
    options: ImportOptions,
    privacySettings?: PrivacySettings
  ): Promise<ImportResult> {
    const startTime = Date.now();
    
    const result: ImportResult = {
      success: false,
      totalConversations: 0,
      importedConversations: 0,
      skippedConversations: 0,
      errors: [],
      warnings: [],
      metadata: {
        platform: options.platform,
        importedAt: new Date().toISOString(),
        processingTime: 0
      }
    };

    try {
      // Parse JSON content
      let parsedData: any;
      try {
        parsedData = JSON.parse(fileContent);
      } catch (error) {
        result.errors.push({
          message: 'Invalid JSON format',
          details: error
        });
        return result;
      }

      // Validate structure
      const structureValidation = ImportValidator.validateJSONStructure(parsedData);
      if (!structureValidation.isValid) {
        result.errors.push({
          message: 'Invalid data structure',
          details: structureValidation.errors
        });
        return result;
      }

      // Parse conversations
      const conversations = ImportParsers.parseConversations(parsedData, options.platform);
      result.totalConversations = conversations.length;

      if (conversations.length === 0) {
        result.errors.push({
          message: 'No conversations found in the provided data'
        });
        return result;
      }

      // Validate individual conversations
      const validationResults = conversations.map(conv => 
        ImportValidator.validateConversationStructure(conv)
      );

      const hasValidationErrors = validationResults.some(vr => !vr.isValid);
      if (hasValidationErrors && options.validateContent) {
        const errors = validationResults.flatMap(vr => vr.errors);
        result.errors.push({
          message: 'Conversation validation failed',
          details: errors.slice(0, 10) // Limit error details
        });
        return result;
      }

      // Collect warnings
      const warnings = validationResults.flatMap(vr => vr.warnings);
      result.warnings.push(...warnings);

      // Sanitize conversations
      const sanitizedConversations = ImportValidator.sanitizeConversations(
        conversations,
        options,
        privacySettings
      );

      // Import to database
      await this.importToDatabase(userId, sanitizedConversations, options, result);

      result.success = result.importedConversations > 0;
      result.metadata.processingTime = Date.now() - startTime;

      return result;

    } catch (error) {
      result.errors.push({
        message: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      result.metadata.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Export conversations to specified format
   */
  static async exportConversations(
    userId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // Fetch conversations
      const conversations = await this.fetchConversationsForExport(userId, options);

      if (conversations.length === 0) {
        throw new Error('No conversations found for export');
      }

      // Generate export content
      const { content, contentType, fileExtension } = this.generateExportContent(
        conversations,
        options
      );

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `aspendos-conversations-${options.format}-${timestamp}${fileExtension}`;

      const result: ExportResult = {
        success: true,
        fileName: filename,
        fileSize: new Blob([content]).size,
        conversationCount: conversations.length,
        format: options.format,
        metadata: {
          exportedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

      return result;

    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's conversation statistics for export planning
   */
  static async getUserConversationStats(userId: string): Promise<ProcessingStats> {
    try {
      const result = await contextManager.getUserConversations(userId, 10000, 0);
      const conversations = result.conversations;

      return ImportParsers.generateProcessingStats(conversations);
    } catch (error) {
      console.error('Failed to get user conversation stats:', error);
      return {
        totalMessages: 0,
        totalCharacters: 0,
        averageMessageLength: 0,
        messagesByRole: {},
        dateRange: {
          earliest: new Date().toISOString(),
          latest: new Date().toISOString()
        },
        modelsUsed: {},
        platformFeatures: []
      };
    }
  }

  /**
   * Validate import file before processing
   */
  static validateImportFile(file: File, content: string): {
    isValid: boolean;
    platform?: SupportedPlatform;
    errors: string[];
    warnings: string[];
    riskScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // File validation
    const fileValidation = ImportValidator.validateFile(file);
    if (!fileValidation.isValid) {
      errors.push(...fileValidation.errors);
    }
    warnings.push(...fileValidation.warnings);
    riskScore += fileValidation.riskScore;

    // Content validation
    try {
      const parsedData = JSON.parse(content);
      const structureValidation = ImportValidator.validateJSONStructure(parsedData);
      
      if (!structureValidation.isValid) {
        errors.push(...structureValidation.errors);
      }
      warnings.push(...structureValidation.warnings);
      riskScore += structureValidation.riskScore;

      // Detect platform
      const platform = ImportParsers.detectPlatform(parsedData);

      return {
        isValid: errors.length === 0,
        platform: platform || undefined,
        errors,
        warnings,
        riskScore: Math.min(100, riskScore)
      };

    } catch (parseError) {
      errors.push('Invalid JSON format');
      riskScore += 50;
    }

    return {
      isValid: false,
      errors,
      warnings,
      riskScore: Math.min(100, riskScore)
    };
  }

  /**
   * Convert between different export formats
   */
  static async convertFormat(
    conversations: BaseConversation[],
    fromFormat: ExportFormat,
    toFormat: ExportFormat,
    options: ExportOptions
  ): Promise<string> {
    // If source format is not our native format, we assume conversations are already parsed
    const { content } = this.generateExportContent(conversations, {
      ...options,
      format: toFormat
    });

    return content;
  }

  // Private helper methods

  private static async importToDatabase(
    userId: string,
    conversations: BaseConversation[],
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    for (const conversation of conversations) {
      try {
        // Check if conversation exists
        const existingConv = await contextManager.loadConversation(conversation.id);
        
        if (existingConv) {
          switch (options.mergeStrategy) {
            case 'skip_existing':
              result.skippedConversations++;
              result.warnings.push(`Skipped existing conversation: ${conversation.title}`);
              continue;
              
            case 'replace':
              await contextManager.deleteContext(conversation.id, userId);
              break;
              
            case 'merge':
              conversation.id = `${conversation.id}_imported_${Date.now()}`;
              break;
          }
        }

        // Create conversation context
        const context = await contextManager.getOrCreateContext(
          userId,
          options.preserveIds ? conversation.id : undefined,
          conversation.model || 'gpt-4o'
        );

        // Update context metadata
        context.title = conversation.title;
        context.metadata.currentModel = conversation.model || 'gpt-4o';
        context.metadata.startedAt = new Date(conversation.createdAt);
        context.metadata.lastActivity = new Date(conversation.updatedAt);

        if (options.includeMetadata && conversation.metadata) {
          if (conversation.metadata.summary) {
            context.metadata.summary = conversation.metadata.summary;
          }
          if (conversation.metadata.tokenCount) {
            context.metadata.tokenCount = conversation.metadata.tokenCount;
          }
        }

        // Add messages
        for (const message of conversation.messages) {
          await contextManager.addMessage(context.id, {
            role: message.role,
            content: message.content,
            model: message.model,
            tokenCount: message.metadata?.tokenCount,
            metadata: message.metadata
          });
        }

        result.importedConversations++;

      } catch (error) {
        result.errors.push({
          conversationId: conversation.id,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        });
      }
    }
  }

  private static async fetchConversationsForExport(
    userId: string,
    options: ExportOptions
  ): Promise<BaseConversation[]> {
    // If specific conversation IDs are requested
    if (options.conversationIds && options.conversationIds.length > 0) {
      const conversations: BaseConversation[] = [];
      
      for (const convId of options.conversationIds) {
        const conversation = await contextManager.loadConversation(convId);
        if (conversation && conversation.userId === userId) {
          conversations.push(conversation);
        }
      }
      
      return conversations;
    }

    // Get all user conversations
    const result = await contextManager.getUserConversations(
      userId,
      options.pagination?.limit || 10000,
      options.pagination?.offset || 0
    );

    let conversations = result.conversations;

    // Apply date range filter
    if (options.dateRange) {
      const startDate = new Date(options.dateRange.start);
      const endDate = new Date(options.dateRange.end);
      
      conversations = conversations.filter(conv => {
        const convDate = new Date(conv.createdAt);
        return convDate >= startDate && convDate <= endDate;
      });
    }

    return conversations;
  }

  private static generateExportContent(
    conversations: BaseConversation[],
    options: ExportOptions
  ): { content: string; contentType: string; fileExtension: string } {
    let content: string;
    let contentType: string;
    let fileExtension: string;

    switch (options.format) {
      case 'json':
        content = ExportFormatters.toJSON(conversations, options);
        contentType = 'application/json';
        fileExtension = '.json';
        break;

      case 'markdown':
        content = ExportFormatters.toMarkdown(conversations, options);
        contentType = 'text/markdown';
        fileExtension = '.md';
        break;

      case 'csv':
        content = ExportFormatters.toCSV(conversations, options);
        contentType = 'text/csv';
        fileExtension = '.csv';
        break;

      case 'html':
        content = ExportFormatters.toHTML(conversations, options);
        contentType = 'text/html';
        fileExtension = '.html';
        break;

      case 'txt':
        content = ExportFormatters.toText(conversations, options);
        contentType = 'text/plain';
        fileExtension = '.txt';
        break;

      case 'pdf':
        // For now, export as HTML with suggestion for PDF conversion
        content = ExportFormatters.toHTML(conversations, options);
        contentType = 'text/html';
        fileExtension = '.html';
        break;

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return { content, contentType, fileExtension };
  }

  /**
   * Get supported platforms and their capabilities
   */
  static getSupportedPlatforms(): Array<{
    platform: SupportedPlatform;
    name: string;
    description: string;
    features: string[];
  }> {
    return [
      {
        platform: 'chatgpt',
        name: 'ChatGPT (OpenAI)',
        description: 'Import from ChatGPT conversation exports',
        features: ['Conversation threads', 'Message metadata', 'Model information', 'Timestamps']
      },
      {
        platform: 'claude',
        name: 'Claude (Anthropic)',
        description: 'Import from Claude conversation exports',
        features: ['Chat messages', 'File attachments', 'Conversation metadata', 'Timestamps']
      },
      {
        platform: 'gemini',
        name: 'Google Gemini/Bard',
        description: 'Import from Gemini/Bard conversation exports',
        features: ['Messages', 'Citations', 'Safety ratings', 'Model configuration']
      },
      {
        platform: 'copilot',
        name: 'Microsoft Copilot',
        description: 'Import from Microsoft Copilot chat exports',
        features: ['Chat messages', 'Citations', 'Adaptive cards', 'Conversation types']
      },
      {
        platform: 'aspendos',
        name: 'Aspendos (Native)',
        description: 'Native Aspendos conversation format',
        features: ['Full metadata', 'RAG context', 'Memory integration', 'All platform features']
      }
    ];
  }

  /**
   * Get supported export formats and their capabilities
   */
  static getSupportedExportFormats(): Array<{
    format: ExportFormat;
    name: string;
    description: string;
    features: string[];
    recommended: boolean;
  }> {
    return [
      {
        format: 'json',
        name: 'JSON',
        description: 'Structured data format, best for re-importing',
        features: ['Full metadata', 'Preserves structure', 'Machine readable', 'Compact'],
        recommended: true
      },
      {
        format: 'markdown',
        name: 'Markdown',
        description: 'Human-readable format with formatting',
        features: ['Human readable', 'Formatted text', 'Easy to edit', 'GitHub compatible'],
        recommended: true
      },
      {
        format: 'csv',
        name: 'CSV',
        description: 'Spreadsheet format for analysis',
        features: ['Data analysis', 'Excel compatible', 'Tabular format', 'Statistical analysis'],
        recommended: false
      },
      {
        format: 'html',
        name: 'HTML',
        description: 'Web format with rich styling',
        features: ['Rich formatting', 'Web compatible', 'Styled output', 'Print friendly'],
        recommended: false
      },
      {
        format: 'txt',
        name: 'Plain Text',
        description: 'Simple text format',
        features: ['Universal compatibility', 'Minimal size', 'Basic format', 'No styling'],
        recommended: false
      },
      {
        format: 'pdf',
        name: 'PDF',
        description: 'Document format (exported as HTML)',
        features: ['Document format', 'Print ready', 'Professional', 'Fixed layout'],
        recommended: false
      }
    ];
  }
}