import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { modelAnalytics } from '@/lib/analytics/ModelAnalytics';

/**
 * Model Analytics API Endpoint
 * Provides comprehensive model performance and cost analytics
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'realtime';
    const period = url.searchParams.get('period') as 'hour' | 'day' | 'week' | 'month' || 'day';
    const modelId = url.searchParams.get('modelId');
    const timeRange = parseInt(url.searchParams.get('timeRange') || '24');

    switch (action) {
      case 'realtime':
        const realtimeStats = modelAnalytics.getRealTimeStats();
        return NextResponse.json({
          success: true,
          data: realtimeStats
        });

      case 'model':
        if (!modelId) {
          return NextResponse.json({ error: 'Model ID required' }, { status: 400 });
        }
        const modelMetrics = modelAnalytics.getModelMetrics(modelId, timeRange);
        return NextResponse.json({
          success: true,
          data: modelMetrics
        });

      case 'cost':
        const costAnalysis = modelAnalytics.getCostAnalysis(timeRange);
        return NextResponse.json({
          success: true,
          data: costAnalysis
        });

      case 'report':
        const performanceReport = modelAnalytics.generatePerformanceReport(period);
        return NextResponse.json({
          success: true,
          data: performanceReport
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analytics data' },
      { status: 500 }
    );
  }
}

/**
 * Record model usage event
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventData = await req.json();
    
    // Validate required fields
    const requiredFields = ['userId', 'modelId', 'provider', 'requestType', 'tokensUsed', 'responseTime', 'success', 'cost'];
    for (const field of requiredFields) {
      if (eventData[field] === undefined) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Record the event
    modelAnalytics.recordEvent({
      userId: eventData.userId,
      modelId: eventData.modelId,
      provider: eventData.provider,
      requestType: eventData.requestType,
      tokensUsed: eventData.tokensUsed,
      responseTime: eventData.responseTime,
      success: eventData.success,
      cost: eventData.cost,
      error: eventData.error,
      inputLength: eventData.inputLength || 0,
      outputLength: eventData.outputLength || 0,
      quality: eventData.quality,
      mode: eventData.mode,
      contextWindow: eventData.contextWindow,
      metadata: eventData.metadata
    });

    return NextResponse.json({
      success: true,
      message: 'Event recorded successfully'
    });
  } catch (error) {
    console.error('Analytics record API error:', error);
    return NextResponse.json(
      { error: 'Failed to record analytics event' },
      { status: 500 }
    );
  }
}

/**
 * Export analytics data
 */
export async function PUT(req: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exportData = modelAnalytics.exportData();
    
    return NextResponse.json({
      success: true,
      data: exportData,
      message: `Exported ${exportData.eventCount} analytics events`
    });
  } catch (error) {
    console.error('Analytics export API error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}

/**
 * Clean up old analytics data
 */
export async function DELETE(req: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    modelAnalytics.cleanup();
    
    return NextResponse.json({
      success: true,
      message: 'Analytics data cleaned up successfully'
    });
  } catch (error) {
    console.error('Analytics cleanup API error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup analytics data' },
      { status: 500 }
    );
  }
}