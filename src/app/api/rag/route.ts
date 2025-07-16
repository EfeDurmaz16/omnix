import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChromaRAG } from '@/lib/rag/ChromaRAG';

let ragSystem: ChromaRAG | null = null;

function getRagSystem(): ChromaRAG {
  if (!ragSystem) {
    ragSystem = new ChromaRAG();
  }
  return ragSystem;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    const rag = getRagSystem();

    switch (action) {
      case 'search':
        const query = searchParams.get('query');
        if (!query) {
          return NextResponse.json(
            { error: 'Query parameter is required' },
            { status: 400 }
          );
        }

        const topK = parseInt(searchParams.get('topK') || '5');
        const memoryTypes = searchParams.get('memoryTypes')?.split(',');

        const memories = await rag.searchRelevantMemories(
          userId,
          query,
          topK,
          memoryTypes
        );

        return NextResponse.json({
          success: true,
          data: memories
        });

      case 'stats':
        const stats = await rag.getMemoryStats(userId);
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'health':
        const isHealthy = await rag.healthCheck();
        const isInitialized = await rag.isInitialized();
        
        return NextResponse.json({
          success: true,
          data: {
            healthy: isHealthy,
            initialized: isInitialized,
            timestamp: new Date().toISOString()
          }
        });

      case 'websearch-history':
        const searchQuery = searchParams.get('searchQuery');
        if (!searchQuery) {
          return NextResponse.json(
            { error: 'searchQuery parameter is required' },
            { status: 400 }
          );
        }

        const webTopK = parseInt(searchParams.get('topK') || '3');
        const webResults = await rag.searchWebHistory(userId, searchQuery, webTopK);

        return NextResponse.json({
          success: true,
          data: webResults
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ RAG GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    const rag = getRagSystem();

    switch (action) {
      case 'store-conversation':
        const { conversation } = body;
        if (!conversation) {
          return NextResponse.json(
            { error: 'Conversation data is required' },
            { status: 400 }
          );
        }

        await rag.storeConversation(userId, conversation);
        
        return NextResponse.json({
          success: true,
          message: 'Conversation stored successfully'
        });

      case 'store-websearch':
        const { query, results } = body;
        if (!query || !results) {
          return NextResponse.json(
            { error: 'Query and results are required' },
            { status: 400 }
          );
        }

        await rag.storeWebSearchResults(userId, query, results);
        
        return NextResponse.json({
          success: true,
          message: 'Web search results stored successfully'
        });

      case 'clear-memories':
        await rag.clearUserMemories(userId);
        
        return NextResponse.json({
          success: true,
          message: 'All user memories cleared successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ RAG POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rag = getRagSystem();
    await rag.clearUserMemories(userId);
    
    return NextResponse.json({
      success: true,
      message: 'All user memories deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ RAG DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}