import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface UsageRecord {
  userId: string;
  action: 'text_generation' | 'image_generation' | 'video_generation';
  model: string;
  tokens: number;
  cost: number;
  timestamp: Date;
}

// Temporary in-memory store (replace with database in production)
const usageStore = new Map<string, UsageRecord[]>();
const userCredits = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, model, tokens, cost } = body;

    // Validate input
    if (!action || !model || typeof tokens !== 'number' || typeof cost !== 'number') {
      return NextResponse.json(
        { error: 'Invalid usage data' },
        { status: 400 }
      );
    }

    // Create usage record
    const record: UsageRecord = {
      userId,
      action,
      model,
      tokens,
      cost,
      timestamp: new Date(),
    };

    // Store usage record
    const userUsage = usageStore.get(userId) || [];
    userUsage.push(record);
    usageStore.set(userId, userUsage);

    // Deduct credits
    const currentCredits = userCredits.get(userId) || 1000; // Default credits
    const newCredits = Math.max(0, currentCredits - cost);
    userCredits.set(userId, newCredits);

    return NextResponse.json({
      success: true,
      remainingCredits: newCredits,
      usageId: `usage_${Date.now()}`,
    });

  } catch (error) {
    console.error('Usage API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';

    // Get user usage
    const userUsage = usageStore.get(userId) || [];
    const currentCredits = userCredits.get(userId) || 1000;

    // Calculate period filter
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Filter usage by period
    const periodUsage = userUsage.filter(record => record.timestamp >= startDate);

    // Calculate statistics
    const stats = {
      totalTokens: periodUsage.reduce((sum, record) => sum + record.tokens, 0),
      totalCost: periodUsage.reduce((sum, record) => sum + record.cost, 0),
      textGenerations: periodUsage.filter(r => r.action === 'text_generation').length,
      imageGenerations: periodUsage.filter(r => r.action === 'image_generation').length,
      videoGenerations: periodUsage.filter(r => r.action === 'video_generation').length,
      remainingCredits: currentCredits,
      period: period,
    };

    return NextResponse.json({
      stats,
      usage: periodUsage.slice(-50), // Last 50 records
    });

  } catch (error) {
    console.error('Usage GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 