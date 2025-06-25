import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export interface StoredVideo {
  id: string;
  url: string; // Can be a regular URL (https://) or data URL (data:video/mp4;base64,...)
  prompt: string;
  model: string;
  duration: number;
  createdAt: string;
  userId?: string;
  size: number; // Size in bytes
  format: string; // Video format (mp4, webm, etc.)
}

// Simple in-memory storage for demo purposes with file backup
// In production, this should be replaced with a proper database
const videoStorage = new Map<string, StoredVideo>();

// Storage file path for server-side persistence
const STORAGE_FILE = path.join(process.cwd(), 'video-storage.json');

// Load videos from storage on initialization
let initialized = false;

export class VideoStorage {
  private static async initialize() {
    if (initialized) return;
    
    try {
      // Try to load from file storage (server-side)
      try {
        const data = await fs.readFile(STORAGE_FILE, 'utf8');
        const videos = JSON.parse(data) as StoredVideo[];
        videos.forEach(video => {
          videoStorage.set(video.id, video);
        });
        console.log(`📁 Loaded ${videos.length} videos from file storage`);
      } catch (fileError) {
        // File doesn't exist or is corrupted, try localStorage (client-side)
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('omnix-videos');
          if (stored) {
            const videos = JSON.parse(stored) as StoredVideo[];
            videos.forEach(video => {
              videoStorage.set(video.id, video);
            });
            console.log(`📁 Loaded ${videos.length} videos from localStorage`);
          }
        }
      }
    } catch (error) {
      console.warn('Could not load videos from storage:', error);
    }
    
    initialized = true;
  }

  private static async persist() {
    try {
      const videos = Array.from(videoStorage.values());
      
      // Try to persist to file storage (server-side)
      try {
        await fs.writeFile(STORAGE_FILE, JSON.stringify(videos, null, 2));
        console.log(`💾 Persisted ${videos.length} videos to file storage`);
      } catch (fileError) {
        // Fall back to localStorage (client-side)
        if (typeof window !== 'undefined') {
          localStorage.setItem('omnix-videos', JSON.stringify(videos));
          console.log(`💾 Persisted ${videos.length} videos to localStorage`);
        } else {
          console.warn('Could not persist to file or localStorage:', fileError);
        }
      }
    } catch (error) {
      console.warn('Could not persist videos:', error);
    }
  }

  static async store(video: Omit<StoredVideo, 'id'>): Promise<StoredVideo> {
    await this.initialize();
    
    const id = this.generateVideoId(video.prompt, video.model);
    const storedVideo: StoredVideo = {
      ...video,
      id
    };
    
    videoStorage.set(id, storedVideo);
    console.log('📁 Video stored with ID:', id);
    console.log('🔗 Video URL:', storedVideo.url);
    
    // Persist to localStorage for demo persistence
    await this.persist();
    
    return storedVideo;
  }

  static async get(id: string): Promise<StoredVideo | null> {
    await this.initialize();
    const video = videoStorage.get(id) || null;
    console.log(`🔍 Retrieved video ${id}:`, video ? 'found' : 'not found');
    return video;
  }

  static async list(userId?: string): Promise<StoredVideo[]> {
    await this.initialize();
    const videos = Array.from(videoStorage.values());
    
    console.log(`📋 Total videos in storage: ${videos.length}`);
    
    let filteredVideos = videos;
    if (userId) {
      filteredVideos = videos.filter(v => v.userId === userId);
      console.log(`📋 Filtered for user ${userId}: ${filteredVideos.length} videos`);
    }
    
    // Sort by creation date (newest first)
    filteredVideos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return filteredVideos;
  }

  static async delete(id: string): Promise<boolean> {
    await this.initialize();
    const deleted = videoStorage.delete(id);
    if (deleted) {
      await this.persist();
      console.log('🗑️ Deleted video:', id);
    }
    return deleted;
  }

  static async clear(): Promise<void> {
    await this.initialize();
    videoStorage.clear();
    await this.persist();
    console.log('🧹 Cleared all videos');
  }

  private static generateVideoId(prompt: string, model: string): string {
    const hash = createHash('md5')
      .update(`${prompt}-${model}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 12);
    
    return `vid_${hash}`;
  }

  // Utility to get video metadata from URL (mock implementation)
  static async getVideoMetadata(url: string): Promise<{ size: number; format: string }> {
    // In a real implementation, this would analyze the video file
    // For now, return reasonable defaults
    return {
      size: Math.floor(Math.random() * 50) + 10, // 10-60 MB
      format: 'mp4'
    };
  }

  // Mock function to generate a realistic video URL for fallback testing
  static generateMockVideoUrl(prompt: string, _model: string): string {
    // Use Google's sample videos that actually work for demo
    const sampleVideos = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
    ];
    
    // Use a hash of the prompt to consistently return the same video for the same prompt
    const hash = createHash('md5').update(prompt).digest('hex');
    const index = parseInt(hash.substring(0, 2), 16) % sampleVideos.length;
    
    return sampleVideos[index];
  }

  // Function to simulate video generation delay
  static async simulateVideoGeneration(durationSeconds: number = 5): Promise<void> {
    // Simulate realistic generation time (2-10 seconds based on video duration)
    const generationTime = Math.max(2000, durationSeconds * 400);
    await new Promise(resolve => setTimeout(resolve, generationTime));
  }

  // Helper function to create a test video for debugging
  static async createTestVideo(prompt: string = "Test video"): Promise<StoredVideo> {
    const testVideo = await this.store({
      url: this.generateMockVideoUrl(prompt, 'test'),
      prompt: prompt,
      model: 'test-model',
      duration: 5,
      createdAt: new Date().toISOString(),
      userId: 'current-user',
      size: 25,
      format: 'mp4'
    });
    
    console.log('🧪 Created test video:', testVideo);
    return testVideo;
  }
} 