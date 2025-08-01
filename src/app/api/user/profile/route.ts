import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

interface UserProfile {
  age?: number;
  location?: string;
  occupation?: string;
  interests?: string;
  bio?: string;
  university?: string;
  company?: string;
  preferences?: {
    language?: string;
    theme?: string;
    timezone?: string;
  };
}

// GET /api/user/profile - Get user profile
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from localStorage or database
    let userProfile: UserProfile = {};
    
    // Try to get from localStorage first (server-side won't have this)
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`aspendos_user_profile_${userId}`);
      if (stored) {
        userProfile = JSON.parse(stored);
      }
    }
    
    // Also get basic user data from Prisma database
    const userData = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    
    const response = {
      profile: userProfile,
      userData: userData ? {
        name: userData.name,
        email: userData.email,
        plan: userData.plan.toLowerCase(),
        credits: userData.credits,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      } : null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

// POST /api/user/profile - Update user profile
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileData: UserProfile = await req.json();
    
    // Validate profile data
    if (profileData.age && (profileData.age < 0 || profileData.age > 150)) {
      return NextResponse.json(
        { error: 'Invalid age' },
        { status: 400 }
      );
    }

    // Store profile in localStorage (for now)
    // In a real implementation, this would go to a database
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`aspendos_user_profile_${userId}`, JSON.stringify(profileData));
    }

    // Also store in server-side storage if available
    try {
      const path = require('path');
      const fs = require('fs');
      const dataDir = path.join(process.cwd(), '.data');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const profilePath = path.join(dataDir, `profile_${userId}.json`);
      fs.writeFileSync(profilePath, JSON.stringify(profileData, null, 2));
      
      console.log(`✅ User profile saved for ${userId}`);
    } catch (fsError) {
      console.warn('Could not save profile to file system:', fsError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: profileData 
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}