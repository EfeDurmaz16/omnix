import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { FirecrawlWebSearch } from '@/lib/search/FirecrawlWebSearch';

let webSearch: FirecrawlWebSearch | null = null;

function getWebSearch(): FirecrawlWebSearch {
  if (!webSearch) {
    webSearch = new FirecrawlWebSearch();
  }
  return webSearch;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    const body = await request.json();
    const { action, query, options = {}, userQuery, aiResponse, forceSearch = false } = body;

    const search = getWebSearch();

    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'Query is required' },
            { status: 400 }
          );
        }

        const searchResults = await search.searchWeb(query, options);
        
        return NextResponse.json({
          success: true,
          data: {
            query,
            results: searchResults,
            timestamp: new Date().toISOString()
          }
        });

      case 'crawl':
        const { url } = body;
        if (!url) {
          return NextResponse.json(
            { error: 'URL is required' },
            { status: 400 }
          );
        }

        const crawlResult = await search.crawlUrl(url);
        
        return NextResponse.json({
          success: true,
          data: crawlResult
        });

      case 'enhance-response':
        if (!userQuery || !aiResponse) {
          return NextResponse.json(
            { error: 'userQuery and aiResponse are required' },
            { status: 400 }
          );
        }

        const enhancedResponse = await search.enhanceResponseWithWeb(
          userQuery,
          aiResponse,
          forceSearch
        );
        
        return NextResponse.json({
          success: true,
          data: enhancedResponse
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ Web search error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    const search = getWebSearch();

    switch (action) {
      case 'health':
        const isHealthy = await search.healthCheck();
        const isAvailable = search.isAvailable();
        
        return NextResponse.json({
          success: true,
          data: {
            healthy: isHealthy,
            available: isAvailable,
            timestamp: new Date().toISOString()
          }
        });

      case 'history':
        if (!userId) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }

        const limit = parseInt(searchParams.get('limit') || '10');
        const history = await search.getSearchHistory(userId, limit);
        
        return NextResponse.json({
          success: true,
          data: history
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ Web search GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}