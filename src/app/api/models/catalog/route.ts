import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { modelCatalog } from '@/lib/catalog/ModelCatalog';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await handleListModels(searchParams);
      
      case 'categories':
        return await handleGetCategories();
      
      case 'statistics':
        return await handleGetStatistics();
      
      case 'health':
        return await handleGetHealth();
      
      case 'recommendations':
        return await handleGetRecommendations(searchParams);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ Model catalog API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleListModels(searchParams: URLSearchParams) {
  const filter: any = {};
  
  // Parse filter parameters
  if (searchParams.get('provider')) {
    filter.provider = searchParams.get('provider');
  }
  
  if (searchParams.get('category')) {
    filter.category = searchParams.get('category');
  }
  
  if (searchParams.get('type')) {
    filter.type = searchParams.get('type');
  }
  
  if (searchParams.get('maxCost')) {
    filter.maxCost = parseFloat(searchParams.get('maxCost')!);
  }
  
  if (searchParams.get('minContextWindow')) {
    filter.minContextWindow = parseInt(searchParams.get('minContextWindow')!);
  }
  
  if (searchParams.get('freeOnly') === 'true') {
    filter.freeOnly = true;
  }
  
  if (searchParams.get('capabilities')) {
    filter.capabilities = searchParams.get('capabilities')!.split(',');
  }

  const refresh = searchParams.get('refresh') === 'true';
  
  const models = await modelCatalog.getModelsByFilter(filter);
  
  return NextResponse.json({
    success: true,
    data: models,
    total: models.length,
    filter: filter
  });
}

async function handleGetCategories() {
  const categories = await modelCatalog.getCategories();
  
  return NextResponse.json({
    success: true,
    data: categories
  });
}

async function handleGetStatistics() {
  const stats = await modelCatalog.getStatistics();
  
  return NextResponse.json({
    success: true,
    data: stats
  });
}

async function handleGetHealth() {
  const health = await modelCatalog.getProviderHealth();
  
  return NextResponse.json({
    success: true,
    data: health
  });
}

async function handleGetRecommendations(searchParams: URLSearchParams) {
  const task = searchParams.get('task') || 'text';
  const budget = searchParams.get('budget') as 'free' | 'low' | 'medium' | 'high' || 'medium';
  const speed = searchParams.get('speed') as 'fast' | 'balanced' | 'quality' || 'balanced';
  const contextLength = searchParams.get('contextLength') 
    ? parseInt(searchParams.get('contextLength')!) 
    : undefined;

  const recommendations = await modelCatalog.getRecommendations({
    task: task as any,
    budget,
    speed,
    contextLength
  });
  
  return NextResponse.json({
    success: true,
    data: recommendations
  });
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'refresh':
        await modelCatalog.refreshModels();
        return NextResponse.json({
          success: true,
          message: 'Model catalog refreshed successfully'
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ Model catalog POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}