import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function POST() {
  let prisma: PrismaClient | null = null;
  
  try {
    console.log('🔄 Testing database connection with fresh client...');
    
    // Create fresh Prisma client
    prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // Force connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query test passed:', result);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { clerkId: 'user_2ybWF4Ns1Bzgr1jYDYkFkdDWWQU' }
    });
    
    if (!user) {
      // Create user
      const newUser = await prisma.user.create({
        data: {
          clerkId: 'user_2ybWF4Ns1Bzgr1jYDYkFkdDWWQU',
          email: 'efebarandurmaz05@gmail.com',
          name: 'Efe Baran Durmaz',
          plan: 'ULTRA',
          credits: 5000,
        }
      });
      
      // Create initial transaction
      await prisma.creditTransaction.create({
        data: {
          userId: newUser.id,
          amount: 5000,
          type: 'ADMIN_GRANT',
          description: 'Initial ULTRA plan credits'
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'User created successfully',
        user: newUser
      });
    } else {
      // Update existing user to ULTRA
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'ULTRA',
          credits: Math.max(user.credits, 5000)
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'User updated successfully',
        user: updatedUser
      });
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    }, { status: 500 });
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}