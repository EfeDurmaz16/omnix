import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// POST /api/user/profile/seed - Seed user profile with the known data
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Seed profile data based on the known user information
    const profileData = {
      age: 19,
      location: 'Bursa, Turkey',
      occupation: 'Student and Nokia Intern',
      interests: 'Technology, AI development, Programming, Software Engineering',
      bio: 'Computer Technology and Information Systems (CTIS) student at Bilkent University. Currently working as an intern at Nokia. Passionate about technology and AI development.',
      university: 'Bilkent University',
      company: 'Nokia',
      preferences: {
        language: 'en',
        timezone: 'Europe/Istanbul'
      }
    };

    // Store profile in server-side storage
    try {
      const path = require('path');
      const fs = require('fs');
      const dataDir = path.join(process.cwd(), '.data');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const profilePath = path.join(dataDir, `profile_${userId}.json`);
      fs.writeFileSync(profilePath, JSON.stringify(profileData, null, 2));
      
      console.log(`✅ User profile seeded for ${userId}`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Profile seeded successfully',
        profile: profileData 
      });
    } catch (fsError) {
      console.error('Could not save profile to file system:', fsError);
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error seeding user profile:', error);
    return NextResponse.json(
      { error: 'Failed to seed user profile' },
      { status: 500 }
    );
  }
}