import { NextRequest, NextResponse } from 'next/server';
import { costOptimizer } from '@/lib/optimization/CostOptimizer';
import { costAnalytics } from '@/lib/analytics/CostAnalytics';
import { auth } from '@clerk/nextjs/server';

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
    const { action, ...params } = body;

    switch (action) {
      case 'optimize': {
        const { task, requiredCapabilities, qualityPreference, currentModel, userPlan } = params;
        
        const result = await costOptimizer.optimizeModelSelection({
          task,
          requiredCapabilities: requiredCapabilities || ['text'],
          qualityPreference: qualityPreference || 'balanced',
          currentModel,
          userPlan: userPlan || 'free'
        });

        return NextResponse.json(result);
      }

      case 'compare': {
        const { modelIds, task, userPlan } = params;
        
        const comparison = await costOptimizer.compareModelCosts(
          modelIds,
          task,
          userPlan || 'free'
        );

        return NextResponse.json(comparison);
      }

      case 'alternatives': {
        const { modelId, maxCost, userPlan } = params;
        
        const alternatives = await costOptimizer.getBudgetAlternatives(
          modelId,
          maxCost,
          userPlan || 'free'
        );

        return NextResponse.json(alternatives);
      }

      case 'track-usage': {
        const { modelId, modelName, cost, inputTokens, outputTokens, taskType, quality, responseTime } = params;
        
        costAnalytics.setUserId(userId);
        await costAnalytics.trackUsage({
          modelId,
          modelName,
          cost,
          inputTokens,
          outputTokens,
          taskType,
          quality,
          responseTime
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Cost optimization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const timeframe = searchParams.get('timeframe') || 'month';

    costAnalytics.setUserId(userId);

    switch (type) {
      case 'analytics': {
        const analytics = await costAnalytics.getCostAnalytics(timeframe as any);
        return NextResponse.json(analytics);
      }

      case 'opportunities': {
        const opportunities = await costAnalytics.getOptimizationOpportunities();
        return NextResponse.json(opportunities);
      }

      case 'alerts': {
        const alerts = await costAnalytics.getCostAlerts();
        return NextResponse.json(alerts);
      }

      case 'model-comparison': {
        const modelIds = searchParams.get('models')?.split(',') || [];
        if (modelIds.length === 0) {
          return NextResponse.json(
            { error: 'No model IDs provided' },
            { status: 400 }
          );
        }

        const comparison = await costAnalytics.getModelComparison(modelIds);
        return NextResponse.json(comparison);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Cost optimization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}