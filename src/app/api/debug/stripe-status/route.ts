import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check database connection
    let dbStatus = 'disconnected';
    let dbUser = null;
    try {
      await prisma.$connect();
      dbStatus = 'connected';
      
      // Check if user exists in database
      dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: {
          id: true,
          clerkId: true,
          email: true,
          plan: true,
          credits: true,
          createdAt: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              amount: true,
              type: true,
              description: true,
              createdAt: true
            }
          }
        }
      });
    } catch (dbError) {
      console.error('Database connection error:', dbError);
    }

    // Check environment variables
    const envVars = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    };

    return NextResponse.json({
      user: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName
      },
      database: {
        status: dbStatus,
        user: dbUser
      },
      environment: envVars,
      stripe: {
        publishableKeyExists: envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        secretKeyExists: envVars.STRIPE_SECRET_KEY,
        webhookSecretExists: envVars.STRIPE_WEBHOOK_SECRET
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Debug check failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}