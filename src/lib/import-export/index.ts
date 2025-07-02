/**
 * Import/Export System for Aspendos AI Platform
 * 
 * This module provides comprehensive chat import/export functionality supporting
 * multiple AI platform formats and export types with security validation.
 */

// Core services
export { ImportParsers } from './parsers';
export { ExportFormatters } from './formatters';
export { ImportValidator } from './validation';
export { ImportExportService } from './integration-service';

// Types
export type {
  // Base types
  BaseMessage,
  BaseConversation,
  FileAttachment,
  
  // Platform-specific types
  ChatGPTExport,
  ChatGPTConversation,
  ChatGPTMessage,
  ClaudeExport,
  ClaudeConversation,
  GeminiExport,
  GeminiConversation,
  CopilotExport,
  CopilotConversation,
  
  // Configuration types
  ImportOptions,
  ExportOptions,
  PrivacySettings,
  ContentFilter,
  ValidationRule,
  
  // Result types
  ImportResult,
  ExportResult,
  ValidationResult,
  ProcessingStats,
  ProgressUpdate,
  
  // API types
  ImportApiResponse,
  ExportApiResponse,
  BatchOperationResponse,
  
  // Utility types
  SupportedPlatform,
  ExportFormat,
  DeepPartial,
  RequiredFields,
  OptionalFields
} from '@/types/import-export';

// Re-export UI components
export { ImportExportModal } from '@/components/import-export/ImportExportModal';
export { ImportExportButton } from '@/components/import-export/ImportExportButton';

/**
 * Utility functions for common operations
 */
export class ImportExportUtils {
  /**
   * Get user-friendly platform name
   */
  static getPlatformName(platform: any): string {
    const names = {
      chatgpt: 'ChatGPT',
      claude: 'Claude',
      gemini: 'Google Gemini',
      copilot: 'Microsoft Copilot',
      aspendos: 'Aspendos'
    };
    return names[platform as keyof typeof names] || platform;
  }

  /**
   * Get format icon class or emoji
   */
  static getFormatIcon(format: any): string {
    const icons = {
      json: '📄',
      markdown: '📝',
      csv: '📊',
      html: '🌐',
      txt: '📃',
      pdf: '📕'
    };
    return icons[format as keyof typeof icons] || '📄';
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format processing time for display
   */
  static formatProcessingTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.floor((milliseconds % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Validate export options
   */
  static validateExportOptions(options: any): string[] {
    const errors: string[] = [];
    
    if (!options.format) {
      errors.push('Export format is required');
    }
    
    if (options.dateRange) {
      if (!options.dateRange.start || !options.dateRange.end) {
        errors.push('Both start and end dates are required for date range');
      } else if (new Date(options.dateRange.start) > new Date(options.dateRange.end)) {
        errors.push('Start date must be before end date');
      }
    }
    
    return errors;
  }

  /**
   * Validate import options
   */
  static validateImportOptions(options: any): string[] {
    const errors: string[] = [];
    
    if (!options.platform) {
      errors.push('Source platform is required');
    }
    
    if (!options.mergeStrategy) {
      errors.push('Merge strategy is required');
    }
    
    return errors;
  }

  /**
   * Generate sample data for testing
   */
  static generateSampleConversation(): any {
    return {
      id: `sample_${Date.now()}`,
      title: 'Sample Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: 'gpt-4o',
      messages: [
        {
          id: 'msg_1',
          role: 'user',
          content: 'Hello, can you help me with something?',
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg_2',
          role: 'assistant',
          content: 'Of course! I\'d be happy to help you. What do you need assistance with?',
          timestamp: new Date().toISOString(),
          model: 'gpt-4o'
        }
      ],
      metadata: {
        platform: 'aspendos',
        tokenCount: 50,
        cost: 0.001
      }
    };
  }
}

/**
 * Constants for the import/export system
 */
export const IMPORT_EXPORT_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_CONVERSATIONS: 10000,
  MAX_MESSAGES_PER_CONVERSATION: 1000,
  MAX_MESSAGE_LENGTH: 50000,
  MAX_TITLE_LENGTH: 200,
  
  SUPPORTED_PLATFORMS: ['chatgpt', 'claude', 'gemini', 'copilot', 'aspendos'],
  SUPPORTED_EXPORT_FORMATS: ['json', 'markdown', 'csv', 'html', 'txt', 'pdf'],
  SUPPORTED_MIME_TYPES: ['application/json', 'text/plain', 'application/zip'],
  
  RISK_THRESHOLDS: {
    LOW: 20,
    MEDIUM: 50,
    HIGH: 80
  },
  
  BATCH_LIMITS: {
    MAX_OPERATIONS: 10,
    MAX_CONCURRENT: 3
  }
} as const;