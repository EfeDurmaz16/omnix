import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { contextManager } from '@/lib/context/AdvancedContextManager';
import { ChatExportFormatter } from '@/lib/import-export/formatters';
import { 
  SupportedExportFormat, 
  ExportOptions, 
  BaseConversation 
} from '@/types/import-export';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse export options from query parameters
    const options: ExportOptions = {
      format: (searchParams.get('format') || 'json') as SupportedExportFormat,
      includeMetadata: searchParams.get('includeMetadata') !== 'false',
      includeTimestamps: searchParams.get('includeTimestamps') !== 'false',
      includeAttachments: searchParams.get('includeAttachments') === 'true',
      dateRange: searchParams.get('startDate') && searchParams.get('endDate') ? {
        start: new Date(searchParams.get('startDate')!),
        end: new Date(searchParams.get('endDate')!)
      } : undefined,
      conversationIds: searchParams.get('conversationIds')?.split(',').filter(Boolean),
      compression: searchParams.get('compression') === 'true'
    };

    console.log('📤 Exporting conversations for user:', user.id, 'options:', options);

    // Fetch conversations from database
    const conversations = await fetchUserConversations(user.id, options);
    
    if (conversations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No conversations found for export'
      }, { status: 404 });
    }

    // Create export formatter and generate content
    const formatter = new ChatExportFormatter(options);
    const exportResult = await formatter.exportConversations(
      conversations,
      options.format,
      { id: user.id, email: user.emailAddresses[0]?.emailAddress, name: user.fullName || user.firstName }
    );
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;

    console.log('✅ Export completed:', {
      filename: exportResult.filename,
      conversations: conversations.length,
      format: options.format,
      size: exportResult.size,
      processingTime
    });

    // Return file download response
    const response = new NextResponse(
      typeof exportResult.data === 'string' ? exportResult.data : JSON.stringify(exportResult.data),
      {
        status: 200,
        headers: {
          'Content-Type': exportResult.mimeType,
          'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
          'X-Export-Stats': JSON.stringify({
            conversationCount: conversations.length,
            processingTime,
            format: options.format
          })
        },
      }
    );

    return response;

  } catch (error) {
    console.error('❌ Export error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    }, { status: 500 });
  }
}

/**
 * Fetch user conversations based on export options
 */
async function fetchUserConversations(
  userId: string, 
  options: ExportOptions
): Promise<BaseConversation[]> {
  try {
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

    // Get all user conversations with pagination
    const result = await contextManager.getUserConversations(
      userId,
      options.pagination?.limit || 1000,
      options.pagination?.offset || 0
    );

    let conversations = result.conversations;

    // Apply date range filter if specified
    if (options.dateRange) {
      const startDate = new Date(options.dateRange.start);
      const endDate = new Date(options.dateRange.end);
      
      conversations = conversations.filter(conv => {
        const convDate = new Date(conv.createdAt);
        return convDate >= startDate && convDate <= endDate;
      });
    }

    return conversations;

  } catch (error) {
    console.error('Failed to fetch conversations for export:', error);
    return [];
  }
}


 