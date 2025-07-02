import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { ImportParsers } from '@/lib/import-export/parsers';
import { ExportFormatters } from '@/lib/import-export/formatters';
import { ImportValidator } from '@/lib/import-export/validation';
import {
  ExportFormat,
  SupportedPlatform,
  ExportOptions,
  BaseConversation
} from '@/types/import-export';

interface ConversionRequest {
  content: string;
  fromPlatform?: SupportedPlatform;
  toFormat: ExportFormat;
  options?: Partial<ExportOptions>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ConversionRequest = await request.json();
    const { content, fromPlatform, toFormat, options = {} } = body;

    if (!content || !toFormat) {
      return NextResponse.json({
        error: 'Missing required fields: content and toFormat'
      }, { status: 400 });
    }

    console.log('🔄 Converting format for user:', user.id, 'to format:', toFormat);

    // Parse input content
    let parsedData: any;
    try {
      parsedData = JSON.parse(content);
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid JSON content'
      }, { status: 400 });
    }

    // Validate structure
    const structureValidation = ImportValidator.validateJSONStructure(parsedData);
    if (!structureValidation.isValid) {
      return NextResponse.json({
        error: 'Invalid data structure',
        details: structureValidation.errors
      }, { status: 400 });
    }

    // Detect platform if not specified
    const detectedPlatform = fromPlatform || ImportParsers.detectPlatform(parsedData);
    
    if (!detectedPlatform) {
      return NextResponse.json({
        error: 'Unable to detect source platform format'
      }, { status: 400 });
    }

    // Parse conversations
    let conversations: BaseConversation[];
    try {
      conversations = ImportParsers.parseConversations(parsedData, detectedPlatform);
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to parse conversations',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 });
    }

    if (conversations.length === 0) {
      return NextResponse.json({
        error: 'No conversations found in the provided data'
      }, { status: 400 });
    }

    // Set up export options
    const exportOptions: ExportOptions = {
      format: toFormat,
      includeMetadata: options.includeMetadata ?? true,
      includeSystemMessages: options.includeSystemMessages ?? false,
      dateRange: options.dateRange,
      conversationIds: options.conversationIds
    };

    // Generate converted content
    let convertedContent: string;
    let contentType: string;
    let fileExtension: string;

    switch (toFormat) {
      case 'json':
        convertedContent = ExportFormatters.toJSON(conversations, exportOptions);
        contentType = 'application/json';
        fileExtension = '.json';
        break;

      case 'markdown':
        convertedContent = ExportFormatters.toMarkdown(conversations, exportOptions);
        contentType = 'text/markdown';
        fileExtension = '.md';
        break;

      case 'csv':
        convertedContent = ExportFormatters.toCSV(conversations, exportOptions);
        contentType = 'text/csv';
        fileExtension = '.csv';
        break;

      case 'html':
        convertedContent = ExportFormatters.toHTML(conversations, exportOptions);
        contentType = 'text/html';
        fileExtension = '.html';
        break;

      case 'txt':
        convertedContent = ExportFormatters.toText(conversations, exportOptions);
        contentType = 'text/plain';
        fileExtension = '.txt';
        break;

      default:
        return NextResponse.json({
          error: `Unsupported output format: ${toFormat}`
        }, { status: 400 });
    }

    const processingTime = Date.now() - startTime;
    const filename = `converted-${detectedPlatform}-to-${toFormat}-${new Date().toISOString().split('T')[0]}${fileExtension}`;

    console.log('✅ Format conversion completed:', {
      fromPlatform: detectedPlatform,
      toFormat,
      conversations: conversations.length,
      size: convertedContent.length,
      processingTime
    });

    // Return converted content as downloadable file
    return new NextResponse(convertedContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Conversion-Stats': JSON.stringify({
          fromPlatform: detectedPlatform,
          toFormat,
          conversationCount: conversations.length,
          processingTime
        })
      }
    });

  } catch (error) {
    console.error('❌ Conversion error:', error);
    return NextResponse.json({
      error: 'Conversion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return conversion capabilities
    const capabilities = {
      supportedInputPlatforms: [
        'chatgpt',
        'claude', 
        'gemini',
        'copilot',
        'aspendos'
      ] as SupportedPlatform[],
      supportedOutputFormats: [
        'json',
        'markdown',
        'csv',
        'html',
        'txt'
      ] as ExportFormat[],
      features: {
        autoDetection: true,
        validation: true,
        batchConversion: false, // Not implemented yet
        streaming: false        // Not implemented yet
      },
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxConversations: 10000
    };

    return NextResponse.json({
      success: true,
      capabilities,
      user: {
        id: user.id,
        canConvert: true
      }
    });

  } catch (error) {
    console.error('Error getting conversion capabilities:', error);
    return NextResponse.json(
      { error: 'Failed to get conversion capabilities' },
      { status: 500 }
    );
  }
}