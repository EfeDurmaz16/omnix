import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { creditAmount, testType = 'credit-purchase' } = await request.json();

    console.log('🧪 Testing webhook simulation for user:', user.id);

    if (testType === 'credit-purchase') {
      // Simulate credit purchase webhook
      const { EnhancedCreditManager } = await import('@/lib/credits/EnhancedCreditManager');
      const creditManager = EnhancedCreditManager.getInstance();
      
      const result = await creditManager.addCredits(
        creditAmount || 100,
        `Test credit purchase - ${creditAmount || 100} credits (webhook simulation)`,
        {
          testSessionId: `test_session_${Date.now()}`,
          testPurchase: true,
          timestamp: new Date().toISOString()
        },
        user.id
      );
      
      if (result.success) {
        console.log('✅ Test credits added successfully:', {
          userId: user.id,
          amount: creditAmount || 100,
          newBalance: result.newBalance
        });
        
        return NextResponse.json({
          success: true,
          message: 'Test credits added successfully',
          data: {
            amount: creditAmount || 100,
            newBalance: result.newBalance,
            transaction: result.transaction
          }
        });
      } else {
        console.error('❌ Test credit addition failed:', result.error);
        
        return NextResponse.json({
          success: false,
          error: result.error,
          message: 'Failed to add test credits'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid test type'
    }, { status: 400 });

  } catch (error: unknown) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Test webhook failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}