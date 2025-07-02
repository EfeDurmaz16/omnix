/**
 * Validation and sanitization system for secure chat imports
 * Ensures data integrity and prevents malicious content injection
 */

import {
  BaseConversation,
  BaseMessage,
  ImportOptions,
  ValidationRule,
  ContentFilter,
  PrivacySettings
} from '@/types/import-export';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
  riskScore: number; // 0-100, higher = more risky
  securityFlags: string[];
}

export class ImportValidator {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_CONVERSATIONS = 10000;
  private static readonly MAX_MESSAGES_PER_CONVERSATION = 1000;
  private static readonly MAX_MESSAGE_LENGTH = 50000; // characters
  private static readonly MAX_TITLE_LENGTH = 200;
  
  // Security patterns to detect potentially malicious content
  private static readonly SECURITY_PATTERNS = [
    /javascript:/gi,
    /<script[^>]*>.*?<\/script>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /eval\s*\(/gi,
    /document\.(write|cookie|domain)/gi,
    /window\.(location|open)/gi,
    /\${.*?}/g, // Template literals
    /data:text\/html/gi,
    /vbscript:/gi
  ];

  private static readonly SUSPICIOUS_KEYWORDS = [
    'password', 'credit card', 'ssn', 'social security',
    'api key', 'secret', 'token', 'private key',
    'bitcoin', 'wallet', 'cryptocurrency'
  ];

  /**
   * Validate uploaded file before processing
   */
  static validateFile(file: File): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityFlags: string[] = [];
    let riskScore = 0;

    // File size validation
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      riskScore += 20;
    }

    // File type validation
    const allowedTypes = [
      'application/json',
      'text/plain',
      'text/csv',
      'application/zip'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
      riskScore += 30;
    }

    // File name validation
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (suspiciousExtensions.includes(fileExtension)) {
      errors.push(`File extension ${fileExtension} is not allowed`);
      securityFlags.push('suspicious_extension');
      riskScore += 50;
    }

    // Check for suspicious file names
    if (this.containsSuspiciousPatterns(file.name)) {
      warnings.push('File name contains potentially suspicious patterns');
      securityFlags.push('suspicious_filename');
      riskScore += 10;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
      securityFlags
    };
  }

  /**
   * Validate JSON structure before parsing
   */
  static validateJSONStructure(jsonData: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityFlags: string[] = [];
    let riskScore = 0;

    try {
      // Basic structure validation
      if (typeof jsonData !== 'object' || jsonData === null) {
        errors.push('Invalid JSON: Root must be an object');
        return { isValid: false, errors, warnings, riskScore: 100, securityFlags };
      }

      // Check for conversations array
      if (!jsonData.conversations || !Array.isArray(jsonData.conversations)) {
        errors.push('Invalid format: Missing or invalid conversations array');
        riskScore += 30;
      }

      // Validate conversation count
      if (jsonData.conversations && jsonData.conversations.length > this.MAX_CONVERSATIONS) {
        errors.push(`Too many conversations: ${jsonData.conversations.length} (max: ${this.MAX_CONVERSATIONS})`);
        riskScore += 20;
      }

      // Deep structure validation
      if (jsonData.conversations && Array.isArray(jsonData.conversations)) {
        jsonData.conversations.forEach((conv: any, index: number) => {
          const convValidation = this.validateConversationStructure(conv, index);
          errors.push(...convValidation.errors);
          warnings.push(...convValidation.warnings);
          securityFlags.push(...convValidation.securityFlags);
          riskScore += convValidation.riskScore / jsonData.conversations.length;
        });
      }

      // Check for suspicious metadata
      if (jsonData.metadata || jsonData.export_metadata) {
        const metaValidation = this.validateMetadata(jsonData.metadata || jsonData.export_metadata);
        warnings.push(...metaValidation.warnings);
        securityFlags.push(...metaValidation.securityFlags);
        riskScore += metaValidation.riskScore;
      }

    } catch (error) {
      errors.push(`JSON validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      riskScore = 100;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: Math.min(100, riskScore),
      securityFlags
    };
  }

  /**
   * Validate individual conversation structure
   */
  static validateConversationStructure(conversation: any, index?: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityFlags: string[] = [];
    let riskScore = 0;
    const prefix = index !== undefined ? `Conversation ${index}: ` : '';

    // Required fields validation
    const requiredFields = ['id', 'title', 'messages'];
    for (const field of requiredFields) {
      if (!conversation[field]) {
        errors.push(`${prefix}Missing required field: ${field}`);
        riskScore += 10;
      }
    }

    // ID validation
    if (conversation.id) {
      if (typeof conversation.id !== 'string' || conversation.id.length > 100) {
        errors.push(`${prefix}Invalid conversation ID`);
        riskScore += 5;
      }
      
      if (this.containsSuspiciousPatterns(conversation.id)) {
        securityFlags.push('suspicious_id');
        riskScore += 10;
      }
    }

    // Title validation
    if (conversation.title) {
      if (typeof conversation.title !== 'string') {
        errors.push(`${prefix}Title must be a string`);
        riskScore += 5;
      } else if (conversation.title.length > this.MAX_TITLE_LENGTH) {
        errors.push(`${prefix}Title too long (max: ${this.MAX_TITLE_LENGTH})`);
        riskScore += 5;
      }
      
      if (this.containsSuspiciousPatterns(conversation.title)) {
        warnings.push(`${prefix}Title contains potentially suspicious content`);
        securityFlags.push('suspicious_title');
        riskScore += 5;
      }
    }

    // Messages validation
    if (conversation.messages) {
      if (!Array.isArray(conversation.messages)) {
        errors.push(`${prefix}Messages must be an array`);
        riskScore += 20;
      } else {
        if (conversation.messages.length > this.MAX_MESSAGES_PER_CONVERSATION) {
          errors.push(`${prefix}Too many messages: ${conversation.messages.length} (max: ${this.MAX_MESSAGES_PER_CONVERSATION})`);
          riskScore += 15;
        }

        conversation.messages.forEach((msg: any, msgIndex: number) => {
          const msgValidation = this.validateMessageStructure(msg, msgIndex, index);
          errors.push(...msgValidation.errors);
          warnings.push(...msgValidation.warnings);
          securityFlags.push(...msgValidation.securityFlags);
          riskScore += msgValidation.riskScore / conversation.messages.length;
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: Math.min(100, riskScore),
      securityFlags
    };
  }

  /**
   * Validate message structure and content
   */
  static validateMessageStructure(message: any, msgIndex?: number, convIndex?: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityFlags: string[] = [];
    let riskScore = 0;
    const prefix = convIndex !== undefined && msgIndex !== undefined ? 
      `Conversation ${convIndex}, Message ${msgIndex}: ` : '';

    // Required fields
    const requiredFields = ['id', 'role', 'content', 'timestamp'];
    for (const field of requiredFields) {
      if (!message[field]) {
        errors.push(`${prefix}Missing required field: ${field}`);
        riskScore += 10;
      }
    }

    // Role validation
    if (message.role) {
      const validRoles = ['user', 'assistant', 'system'];
      if (!validRoles.includes(message.role)) {
        errors.push(`${prefix}Invalid role: ${message.role}`);
        riskScore += 10;
      }
    }

    // Content validation
    if (message.content) {
      if (typeof message.content !== 'string') {
        errors.push(`${prefix}Content must be a string`);
        riskScore += 10;
      } else {
        if (message.content.length > this.MAX_MESSAGE_LENGTH) {
          errors.push(`${prefix}Message too long (max: ${this.MAX_MESSAGE_LENGTH})`);
          riskScore += 10;
        }

        // Security content validation
        const contentValidation = this.validateMessageContent(message.content);
        warnings.push(...contentValidation.warnings.map(w => `${prefix}${w}`));
        securityFlags.push(...contentValidation.securityFlags);
        riskScore += contentValidation.riskScore;
      }
    }

    // Timestamp validation
    if (message.timestamp) {
      const timestamp = new Date(message.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push(`${prefix}Invalid timestamp`);
        riskScore += 5;
      } else {
        // Check for unrealistic dates
        const now = new Date();
        const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        
        if (timestamp < fiveYearsAgo || timestamp > oneYearFromNow) {
          warnings.push(`${prefix}Timestamp appears unusual: ${timestamp.toISOString()}`);
          riskScore += 2;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: Math.min(100, riskScore),
      securityFlags
    };
  }

  /**
   * Validate message content for security issues
   */
  static validateMessageContent(content: string): ValidationResult {
    const warnings: string[] = [];
    const securityFlags: string[] = [];
    let riskScore = 0;

    // Check for security patterns
    for (const pattern of this.SECURITY_PATTERNS) {
      if (pattern.test(content)) {
        warnings.push('Content contains potentially unsafe patterns');
        securityFlags.push('unsafe_patterns');
        riskScore += 20;
        break;
      }
    }

    // Check for suspicious keywords
    const suspiciousCount = this.SUSPICIOUS_KEYWORDS.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;

    if (suspiciousCount > 0) {
      warnings.push(`Content contains ${suspiciousCount} potentially sensitive keywords`);
      securityFlags.push('sensitive_content');
      riskScore += Math.min(30, suspiciousCount * 5);
    }

    // Check for extremely long words (potential data dumps)
    const words = content.split(/\s+/);
    const longWords = words.filter(word => word.length > 100);
    if (longWords.length > 0) {
      warnings.push('Content contains unusually long words');
      securityFlags.push('unusual_content');
      riskScore += 10;
    }

    // Check for base64-like content
    const base64Pattern = /^[A-Za-z0-9+/]{100,}={0,2}$/;
    if (base64Pattern.test(content.replace(/\s/g, ''))) {
      warnings.push('Content appears to contain encoded data');
      securityFlags.push('encoded_content');
      riskScore += 15;
    }

    return {
      isValid: true,
      errors: [],
      warnings,
      riskScore,
      securityFlags
    };
  }

  /**
   * Validate metadata for security concerns
   */
  static validateMetadata(metadata: any): ValidationResult {
    const warnings: string[] = [];
    const securityFlags: string[] = [];
    let riskScore = 0;

    if (!metadata || typeof metadata !== 'object') {
      return { isValid: true, errors: [], warnings, riskScore, securityFlags };
    }

    // Check for suspicious metadata fields
    const suspiciousFields = ['script', 'eval', 'function', 'constructor'];
    for (const field of suspiciousFields) {
      if (field in metadata) {
        warnings.push(`Metadata contains suspicious field: ${field}`);
        securityFlags.push('suspicious_metadata');
        riskScore += 15;
      }
    }

    // Check metadata values
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string' && this.containsSuspiciousPatterns(value)) {
        warnings.push(`Metadata field "${key}" contains suspicious patterns`);
        securityFlags.push('suspicious_metadata_value');
        riskScore += 10;
      }
    }

    return {
      isValid: true,
      errors: [],
      warnings,
      riskScore,
      securityFlags
    };
  }

  /**
   * Sanitize conversation data for safe import
   */
  static sanitizeConversations(
    conversations: BaseConversation[],
    options: ImportOptions,
    privacySettings?: PrivacySettings
  ): BaseConversation[] {
    return conversations.map(conv => this.sanitizeConversation(conv, options, privacySettings));
  }

  /**
   * Sanitize individual conversation
   */
  static sanitizeConversation(
    conversation: BaseConversation,
    options: ImportOptions,
    privacySettings?: PrivacySettings
  ): BaseConversation {
    const sanitized: BaseConversation = {
      ...conversation,
      id: options.preserveIds ? conversation.id : this.generateSafeId(),
      title: this.sanitizeText(conversation.title, this.MAX_TITLE_LENGTH),
      messages: conversation.messages.map(msg => this.sanitizeMessage(msg, privacySettings)),
      createdAt: this.sanitizeDate(conversation.createdAt),
      updatedAt: this.sanitizeDate(conversation.updatedAt)
    };

    // Remove potentially unsafe metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeMetadata(sanitized.metadata);
    }

    return sanitized;
  }

  /**
   * Sanitize message content
   */
  static sanitizeMessage(message: BaseMessage, privacySettings?: PrivacySettings): BaseMessage {
    let content = message.content;

    // Apply privacy filters
    if (privacySettings?.excludeSensitiveContent) {
      content = this.removeSensitiveContent(content);
    }

    if (privacySettings?.anonymizeUserData) {
      content = this.anonymizeUserData(content);
    }

    return {
      ...message,
      id: this.generateSafeId(),
      content: this.sanitizeText(content, this.MAX_MESSAGE_LENGTH),
      timestamp: this.sanitizeDate(message.timestamp),
      metadata: message.metadata ? this.sanitizeMetadata(message.metadata) : undefined
    };
  }

  /**
   * Sanitize text content
   */
  static sanitizeText(text: string, maxLength: number): string {
    if (!text || typeof text !== 'string') return '';

    // Remove security patterns
    let sanitized = text;
    for (const pattern of this.SECURITY_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REMOVED_FOR_SECURITY]');
    }

    // Trim whitespace and limit length
    sanitized = sanitized.trim();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength - 3) + '...';
    }

    return sanitized;
  }

  /**
   * Sanitize metadata objects
   */
  static sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') return {};

    const sanitized: any = {};
    const allowedFields = [
      'platform', 'version', 'tokenCount', 'cost', 'summary',
      'sources', 'confidence', 'factChecked', 'attachments'
    ];

    for (const field of allowedFields) {
      if (field in metadata) {
        const value = metadata[field];
        
        if (typeof value === 'string') {
          sanitized[field] = this.sanitizeText(value, 1000);
        } else if (typeof value === 'number' && isFinite(value)) {
          sanitized[field] = value;
        } else if (typeof value === 'boolean') {
          sanitized[field] = value;
        } else if (Array.isArray(value) && field === 'sources') {
          sanitized[field] = value
            .filter(item => typeof item === 'string')
            .map(item => this.sanitizeText(item, 500))
            .slice(0, 10); // Limit to 10 sources
        }
      }
    }

    return sanitized;
  }

  /**
   * Remove sensitive content patterns
   */
  static removeSensitiveContent(content: string): string {
    let sanitized = content;

    // Email addresses
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REMOVED]');

    // Phone numbers
    sanitized = sanitized.replace(/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, '[PHONE_REMOVED]');

    // Credit card patterns
    sanitized = sanitized.replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[CARD_REMOVED]');

    // Social Security Numbers
    sanitized = sanitized.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN_REMOVED]');

    // API keys and tokens (simple patterns)
    sanitized = sanitized.replace(/[A-Za-z0-9]{20,}/g, match => {
      if (this.SUSPICIOUS_KEYWORDS.some(keyword => 
        content.toLowerCase().includes(keyword) && content.toLowerCase().includes(match.toLowerCase())
      )) {
        return '[TOKEN_REMOVED]';
      }
      return match;
    });

    return sanitized;
  }

  /**
   * Anonymize user data
   */
  static anonymizeUserData(content: string): string {
    let sanitized = content;

    // Replace common name patterns with placeholders
    sanitized = sanitized.replace(/\bMy name is \w+/gi, 'My name is [NAME]');
    sanitized = sanitized.replace(/\bI'm \w+/gi, "I'm [NAME]");
    sanitized = sanitized.replace(/\bI am \w+/gi, 'I am [NAME]');

    return sanitized;
  }

  // Helper methods
  private static containsSuspiciousPatterns(text: string): boolean {
    return this.SECURITY_PATTERNS.some(pattern => pattern.test(text));
  }

  private static generateSafeId(): string {
    return `sanitized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static sanitizeDate(date: string | Date): string {
    try {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return new Date().toISOString();
      }
      return parsed.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Generate comprehensive validation report
   */
  static generateValidationReport(
    conversations: BaseConversation[],
    validationResults: ValidationResult[]
  ): {
    overallRisk: 'low' | 'medium' | 'high';
    summary: string;
    details: any;
  } {
    const totalRisk = validationResults.reduce((sum, result) => sum + result.riskScore, 0);
    const averageRisk = totalRisk / validationResults.length;
    
    const overallRisk = averageRisk < 20 ? 'low' : averageRisk < 50 ? 'medium' : 'high';
    
    const totalErrors = validationResults.reduce((sum, result) => sum + result.errors.length, 0);
    const totalWarnings = validationResults.reduce((sum, result) => sum + result.warnings.length, 0);
    
    const allSecurityFlags = validationResults.flatMap(result => result.securityFlags);
    const uniqueFlags = [...new Set(allSecurityFlags)];

    return {
      overallRisk,
      summary: `Validation complete: ${totalErrors} errors, ${totalWarnings} warnings. Risk level: ${overallRisk}`,
      details: {
        totalConversations: conversations.length,
        totalMessages: conversations.reduce((sum, conv) => sum + conv.messages.length, 0),
        averageRiskScore: Math.round(averageRisk),
        errors: totalErrors,
        warnings: totalWarnings,
        securityFlags: uniqueFlags,
        flagCounts: uniqueFlags.reduce((acc, flag) => {
          acc[flag] = allSecurityFlags.filter(f => f === flag).length;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  }
}