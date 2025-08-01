import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    // First, try to connect to database
    await prisma.$connect();

    // Check if user exists in database
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!dbUser) {
      // Create user if doesn't exist
      dbUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          email: email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
          plan: 'ULTRA', // Set to ULTRA since you purchased it
          credits: 1500, // Default starting credits
        },
        include: {
          transactions: true
        }
      });

      // Create initial credit transaction
      await prisma.creditTransaction.create({
        data: {
          userId: dbUser.id,
          amount: 1500,
          type: 'BONUS',
          description: 'Welcome bonus credits'
        }
      });

      return NextResponse.json({
        message: 'User created with ULTRA plan and credits',
        user: dbUser,
        action: 'created'
      });
    } else {
      // User exists, let's fix their plan and credits
      const updates: any = {};
      
      // If they have ULTRA plan but 0 credits, add credits
      if (dbUser.plan === 'FREE' || dbUser.credits === 0) {
        updates.plan = 'ULTRA';
        updates.credits = Math.max(dbUser.credits, 5000); // Give ULTRA credits
      }

      if (Object.keys(updates).length > 0) {
        const updatedUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: updates,
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        });

        // Create credit transaction for the fix
        if (updates.credits && updates.credits > dbUser.credits) {
          await prisma.creditTransaction.create({
            data: {
              userId: dbUser.id,
              amount: updates.credits - dbUser.credits,
              type: 'ADMIN_GRANT',
              description: 'Credits restored - ULTRA plan fix'
            }
          });
        }

        return NextResponse.json({
          message: 'User plan and credits fixed',
          user: updatedUser,
          action: 'updated',
          changes: updates
        });
      } else {
        return NextResponse.json({
          message: 'User already has correct plan and credits',
          user: dbUser,
          action: 'no_change'
        });
      }
    }

  } catch (error) {
    console.error('Fix credits error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix credits', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}