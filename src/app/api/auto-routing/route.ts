import { NextRequest, NextResponse } from 'next/server';
import { autoRouter } from '@/lib/routing/AutoRouter';
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
      case 'route': {
        const { query, userPlan, userPreference, hasAutoRouting, currentModel, context } = params;
        
        if (!query) {
          return NextResponse.json(
            { error: 'Query is required' },
            { status: 400 }
          );
        }

        const result = await autoRouter.routeQuery({
          query,
          userPlan: userPlan || 'free',
          userPreference: userPreference || 'balanced',
          hasAutoRouting: hasAutoRouting !== false, // Default to true
          currentModel,
          context
        });

        return NextResponse.json(result);
      }

      case 'analyze': {
        const { query } = params;
        
        if (!query) {
          return NextResponse.json(
            { error: 'Query is required' },
            { status: 400 }
          );
        }

        // This would be a more detailed analysis endpoint
        // For now, we'll use the routing result which includes analysis
        const result = await autoRouter.routeQuery({
          query,
          userPlan: 'free', // Default for analysis
          userPreference: 'balanced',
          hasAutoRouting: true
        });

        return NextResponse.json({
          analysis: {
            type: result.routingReason.includes('Simple') ? 'simple' : 
                  result.routingReason.includes('Creative') ? 'creative' :
                  result.routingReason.includes('Analytical') ? 'analytical' :
                  result.routingReason.includes('Coding') ? 'code' : 'complex',
            confidence: result.confidence,
            shouldRedirect: result.shouldRedirect,
            redirectPage: result.redirectPage,
            estimatedCost: result.estimatedCost,
            estimatedSpeed: result.estimatedSpeed
          },
          recommendation: result
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('Auto-routing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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

    switch (type) {
      case 'models': {
        // Return available models for user's plan
        const userPlan = searchParams.get('plan') || 'free';
        
        const modelsByPlan: { [key: string]: Array<{id: string; name: string; provider: string; speed: string; cost: string}> } = {
          'free': [
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', speed: 'fast', cost: 'low' },
            { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', speed: 'fastest', cost: 'lowest' },
            { id: 'gemini-flash', name: 'Gemini Flash', provider: 'google', speed: 'fastest', cost: 'lowest' }
          ],
          'pro': [
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', speed: 'fast', cost: 'low' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', speed: 'fast', cost: 'low' },
            { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', speed: 'fastest', cost: 'lowest' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', speed: 'medium', cost: 'medium' },
            { id: 'gemini-flash', name: 'Gemini Flash', provider: 'google', speed: 'fastest', cost: 'lowest' },
            { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', speed: 'medium', cost: 'medium' }
          ],
          'ultra': [
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', speed: 'fast', cost: 'low' },
            { id: 'gpt-4', name: 'GPT-4', provider: 'openai', speed: 'slow', cost: 'high' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', speed: 'medium', cost: 'high' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', speed: 'fast', cost: 'low' },
            { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', speed: 'fastest', cost: 'lowest' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', speed: 'medium', cost: 'medium' },
            { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', speed: 'slow', cost: 'highest' },
            { id: 'gemini-flash', name: 'Gemini Flash', provider: 'google', speed: 'fastest', cost: 'lowest' },
            { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', speed: 'medium', cost: 'medium' }
          ]
        };

        const models = modelsByPlan[userPlan] || modelsByPlan['free'];
        return NextResponse.json({ models });
      }

      case 'stats': {
        // Return routing statistics for the user
        // This would normally come from a database
        const stats = {
          totalQueries: 150,
          autoRouted: 120,
          manuallyRouted: 30,
          savings: 23.50, // Estimated savings in dollars
          topRedirectedType: 'image',
          mostUsedModel: 'gpt-3.5-turbo',
          averageConfidence: 0.82
        };

        return NextResponse.json(stats);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('Auto-routing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}