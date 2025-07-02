import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { contextManager } from '@/lib/context/AdvancedContextManager';
import { ImportParsers } from '@/lib/import-export/parsers';
import { ImportValidator } from '@/lib/import-export/validation';
import {
  ImportOptions,
  ImportApiResponse,
  ImportResult,
  BaseConversation,
  SupportedPlatform,
  PrivacySettings
} from '@/types/import-export';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SUPPORTED_MIME_TYPES = [
  'application/json',
  'text/plain',
  'application/zip'
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      } as ImportApiResponse, { status: 401 });
    }

    console.log('📥 Processing import request for user:', user.id);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const optionsJson = formData.get('options') as string;
    const privacySettingsJson = formData.get('privacySettings') as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file provided for import'
        }
      } as ImportApiResponse, { status: 400 });
    }

    // Parse options
    let options: ImportOptions;
    try {
      options = optionsJson ? JSON.parse(optionsJson) : {
        platform: 'aspendos' as SupportedPlatform,
        mergeStrategy: 'merge',
        preserveIds: false,
        validateContent: true,
        includeMetadata: true
      };
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_OPTIONS',
          message: 'Invalid import options format'
        }
      } as ImportApiResponse, { status: 400 });
    }

    // Parse privacy settings
    let privacySettings: PrivacySettings | undefined;
    try {
      privacySettings = privacySettingsJson ? JSON.parse(privacySettingsJson) : undefined;
    } catch (error) {
      console.warn('Invalid privacy settings format, using defaults');
    }

    console.log('📋 Import options:', options);

    // Validate file
    const fileValidation = ImportValidator.validateFile(file);
    if (!fileValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: fileValidation.errors.join('; '),
          details: fileValidation
        }
      } as ImportApiResponse, { status: 400 });
    }

    // Security check: Risk assessment
    if (fileValidation.riskScore > 80) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'HIGH_RISK_FILE',
          message: 'File failed security assessment',
          details: fileValidation
        }
      } as ImportApiResponse, { status: 403 });
    }

    // Read and parse file content
    const fileContent = await file.text();
    let parsedData: any;

    try {
      parsedData = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'File does not contain valid JSON'
        }
      } as ImportApiResponse, { status: 400 });
    }

    // Validate JSON structure
    const structureValidation = ImportValidator.validateJSONStructure(parsedData);
    if (!structureValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STRUCTURE',
          message: structureValidation.errors.join('; '),
          details: structureValidation
        }
      } as ImportApiResponse, { status: 400 });
    }

    // Security check: Content validation
    if (structureValidation.riskScore > 70) {
      console.warn('⚠️ Import file has elevated risk score:', structureValidation.riskScore);
    }

    // Parse conversations
    let conversations: BaseConversation[];
    try {
      conversations = ImportParsers.parseConversations(parsedData, options.platform);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PARSE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to parse conversations'
        }
      } as ImportApiResponse, { status: 400 });
    }

    if (conversations.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_CONVERSATIONS',
          message: 'No valid conversations found in file'
        }
      } as ImportApiResponse, { status: 400 });
    }

    console.log(`📊 Parsed ${conversations.length} conversations from ${options.platform} format`);

    // Validate conversations
    const validationResults = conversations.map(conv => 
      ImportValidator.validateConversationStructure(conv)
    );

    const hasValidationErrors = validationResults.some(result => !result.isValid);
    if (hasValidationErrors && options.validateContent) {
      const errors = validationResults.flatMap(result => result.errors);
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: `Conversation validation failed: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '...' : ''}`,
          details: { totalErrors: errors.length, errors: errors.slice(0, 10) }
        }
      } as ImportApiResponse, { status: 400 });
    }

    // Sanitize conversations for security
    const sanitizedConversations = ImportValidator.sanitizeConversations(
      conversations,
      options,
      privacySettings
    );

    console.log('🔒 Sanitized conversations for safe import');

    // Import conversations to database
    const importResult = await importConversationsToDatabase(
      user.id,
      sanitizedConversations,
      options,
      startTime
    );

    // Generate validation report
    const validationReport = ImportValidator.generateValidationReport(
      conversations,
      validationResults
    );

    console.log('✅ Import completed:', {
      userId: user.id,
      totalConversations: conversations.length,
      imported: importResult.importedConversations,
      skipped: importResult.skippedConversations,
      errors: importResult.errors.length,
      processingTime: Date.now() - startTime
    });

    const response: ImportApiResponse = {
      success: true,
      result: {
        ...importResult,
        metadata: {
          ...importResult.metadata,
          validationReport,
          originalFileSize: file.size,
          originalFileName: file.name
        }
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Import error:', error);
    
    const errorResponse: ImportApiResponse = {
      success: false,
      error: {
        code: 'IMPORT_FAILED',
        message: error instanceof Error ? error.message : 'Import failed',
        details: error instanceof Error ? error.stack : undefined
      }
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Import conversations to database
 */
async function importConversationsToDatabase(
  userId: string,
  conversations: BaseConversation[],
  options: ImportOptions,
  startTime: number
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    totalConversations: conversations.length,
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

  for (const conversation of conversations) {
    try {
      // Check if conversation already exists
      const existingConv = await contextManager.loadConversation(conversation.id);
      
      if (existingConv) {
        switch (options.mergeStrategy) {
          case 'skip_existing':
            result.skippedConversations++;
            result.warnings.push(`Skipped existing conversation: ${conversation.title}`);
            continue;
            
          case 'replace':
            // Delete existing conversation first
            await contextManager.deleteContext(conversation.id, userId);
            break;
            
          case 'merge':
            // For merge strategy, we'll create a new conversation with updated ID
            conversation.id = `${conversation.id}_imported_${Date.now()}`;
            break;
        }
      }

      // Create conversation context
      const context = await contextManager.getOrCreateContext(
        userId,
        conversation.id,
        conversation.model || 'gpt-4o'
      );

      // Update context with imported data
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

      // Add messages to conversation
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
      console.log(`📝 Imported conversation: ${conversation.title} (${conversation.messages.length} messages)`);

    } catch (error) {
      console.error(`Failed to import conversation: ${conversation.title}`, error);
      result.errors.push({
        conversationId: conversation.id,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    }
  }

  result.metadata.processingTime = Date.now() - startTime;
  result.success = result.errors.length === 0 || result.importedConversations > 0;

  return result;
}

/**
 * GET endpoint for import status/history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return import capabilities and limits
    const capabilities = {
      supportedPlatforms: ['chatgpt', 'claude', 'gemini', 'copilot', 'aspendos'],
      supportedFormats: ['json'],
      maxFileSize: MAX_FILE_SIZE,
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      features: {
        validation: true,
        sanitization: true,
        privacyFiltering: true,
        mergeStrategies: ['replace', 'merge', 'skip_existing'],
        batchImport: true
      }
    };

    return NextResponse.json({
      success: true,
      capabilities,
      user: {
        id: user.id,
        canImport: true
      }
    });

  } catch (error) {
    console.error('Error getting import capabilities:', error);
    return NextResponse.json(
      { error: 'Failed to get import capabilities' },
      { status: 500 }
    );
  }
}