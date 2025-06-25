// src/lib/gcp-storage.ts

import { Storage } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';
import { setupEnvironment } from './env-setup';

// Set up environment variables
setupEnvironment();

// Initialize clients
console.log('🔧 Initializing GCS/Firestore with config:', {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  bucketName: process.env.GCS_BUCKET_NAME,
});

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: './omni-463513-88580bf51818.json', // Explicit path to service account key
});

// Try different Firestore initialization approaches
let firestore: Firestore;
try {
  // First try with the named database
  firestore = new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    databaseId: 'omni', // Your actual Firestore database name
    keyFilename: './omni-463513-88580bf51818.json', // Explicit path to service account key
  });
  console.log('✅ Firestore initialized with named database "omni"');
} catch (error) {
  console.warn('Could not initialize Firestore with named database, trying default:', error);
  // Fallback to default database
  firestore = new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    keyFilename: './omni-463513-88580bf51818.json', // Explicit path to service account key
  });
  console.log('✅ Firestore initialized with default database');
}

const bucketName = process.env.GCS_BUCKET_NAME || 'omnix-video-storage';

/**
 * Generates a signed URL for uploading a file to Google Cloud Storage.
 * @param userId - The ID of the user uploading the file.
 * @param videoId - The unique ID for the video.
 * @param fileName - The name of the file to be uploaded.
 * @param contentType - The MIME type of the file (e.g., 'video/mp4').
 * @returns The signed URL for the upload.
 */
export async function generateUploadUrl(userId: string, videoId: string, fileName: string, contentType: string): Promise<string> {
  const filePath = `videos/${userId}/${videoId}/${fileName}`;

  // Create a document in Firestore to track the video
  await firestore.collection('videos').doc(videoId).set({
    userId,
    videoId,
    gcsPath: filePath,
    status: 'uploading',
    fileName,
    createdAt: new Date().toISOString(),
  });

  const options = {
    version: 'v4' as const,
    action: 'write' as const,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  };

  const [url] = await storage.bucket(bucketName).file(filePath).getSignedUrl(options);
  console.log(`Generated signed URL for ${filePath}`);
  return url;
}

/**
 * Generates a signed URL for securely viewing/playing a video.
 * @param userId - The ID of the user requesting playback.
 * @param videoId - The ID of the video to be played.
 * @returns The signed URL for playback.
 */
export async function getPlaybackUrl(userId: string, videoId: string): Promise<string> {
  const videoRef = firestore.collection('videos').doc(videoId);
  const doc = await videoRef.get();

  if (!doc.exists) {
    throw new Error('Video not found');
  }

  const videoData = doc.data();

  // Security Check: Ensure the requesting user owns the video
  if (videoData?.userId !== userId) {
    throw new Error('Unauthorized access');
  }

  const options = {
    version: 'v4' as const,
    action: 'read' as const,
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  };

  const [url] = await storage.bucket(bucketName).file(videoData.gcsPath).getSignedUrl(options);
  console.log(`Generated playback URL for ${videoData.gcsPath}`);
  return url;
}

/**
 * Updates video metadata in Firestore after a successful upload.
 * This would typically be called from a Cloud Function triggered by GCS.
 * @param videoId - The ID of the video to update.
 * @param metadata - The metadata to update (e.g., fileSize, duration).
 */
export async function finalizeUpload(videoId: string, metadata: Record<string, any>): Promise<void> {
  const videoRef = firestore.collection('videos').doc(videoId);
  await videoRef.update({
    status: 'completed',
    updatedAt: new Date().toISOString(),
    ...metadata,
  });
  console.log(`Finalized metadata for video ${videoId}`);
}

/**
 * Stores a generated video (from AI providers) in Google Cloud Storage and Firestore.
 * @param videoData - The video data including URL, prompt, model, etc.
 * @returns The stored video metadata from Firestore.
 */
export async function storeGeneratedVideo(videoData: {
  url: string;
  prompt: string;
  model: string;
  duration: number;
  userId?: string;
  size?: number;
  format?: string;
}): Promise<{
  id: string;
  url: string;
  prompt: string;
  model: string;
  duration: number;
  createdAt: string;
  userId: string;
  gcsPath?: string;
}> {
  const videoId = generateVideoId(videoData.prompt, videoData.model);
  const userId = videoData.userId || 'current-user';
  const fileName = `${videoId}.${videoData.format || 'mp4'}`;
  const filePath = `generated-videos/${userId}/${videoId}/${fileName}`;

  try {
    // If it's an external URL (like from Wavespeed), we need to download and upload to GCS
    let gcsPath = '';
    let finalUrl = videoData.url;

    if (videoData.url.startsWith('http')) {
      console.log('📥 Downloading external video to upload to GCS...');
      
      // Download the video from external URL
      const response = await fetch(videoData.url);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      
      const videoBuffer = await response.arrayBuffer();
      const file = storage.bucket(bucketName).file(filePath);
      
      // Upload to GCS
      await file.save(Buffer.from(videoBuffer), {
        metadata: {
          contentType: `video/${videoData.format || 'mp4'}`,
          metadata: {
            originalUrl: videoData.url,
            model: videoData.model,
            prompt: videoData.prompt,
            generatedAt: new Date().toISOString(),
          }
        }
      });
      
      gcsPath = filePath;
      console.log(`📁 Video uploaded to GCS: ${gcsPath}`);
      
      // Generate signed URL for playback
      const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
      
      const [signedUrl] = await file.getSignedUrl(options);
      finalUrl = signedUrl;
      console.log('🔗 Generated signed URL for playback');
      
    } else if (videoData.url.startsWith('data:')) {
      // For data URLs (base64), store directly in GCS
      console.log('📦 Storing base64 video data to GCS...');
      const base64Data = videoData.url.split(',')[1];
      const videoBuffer = Buffer.from(base64Data, 'base64');
      
      const file = storage.bucket(bucketName).file(filePath);
      await file.save(videoBuffer, {
        metadata: {
          contentType: `video/${videoData.format || 'mp4'}`,
          metadata: {
            model: videoData.model,
            prompt: videoData.prompt,
            generatedAt: new Date().toISOString(),
          }
        }
      });
      
      gcsPath = filePath;
      finalUrl = videoData.url; // Keep as data URL for now
      console.log(`📁 Base64 video uploaded to GCS: ${gcsPath}`);
    } else {
      // For other URL types, use as-is (e.g., already uploaded to GCS)
      console.log('🔗 Using provided URL as-is');
      finalUrl = videoData.url;
      gcsPath = ''; // No GCS path for external URLs
    }

    // Store metadata in Firestore (without the huge originalUrl for base64 videos)
    console.log(`🔥 Attempting to store video metadata in Firestore for: ${videoId}`);
    
    // For base64 videos, don't store the original URL as it's too large for Firestore
    let originalUrlToStore = videoData.url;
    if (videoData.url.startsWith('data:video/') && videoData.url.length > 100000) {
      console.log(`📦 Video is large base64 (${videoData.url.length} bytes), storing only type info`);
      originalUrlToStore = `data:video/${videoData.format || 'mp4'};base64,[STORED_IN_GCS]`;
    }
    
    const videoMetadata = {
      videoId,
      userId,
      prompt: videoData.prompt,
      model: videoData.model,
      duration: videoData.duration,
      gcsPath,
      originalUrl: originalUrlToStore,
      status: 'completed',
      fileName,
      size: videoData.size || 0,
      format: videoData.format || 'mp4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`🔥 Video metadata to store:`, JSON.stringify(videoMetadata, null, 2));
    
    try {
      await firestore.collection('generated-videos').doc(videoId).set(videoMetadata);
      console.log(`✅ Video metadata successfully stored in Firestore: ${videoId}`);
    } catch (firestoreError) {
      console.error(`❌ Firestore save failed for ${videoId}:`, firestoreError);
      throw firestoreError; // Re-throw to trigger fallback
    }

    return {
      id: videoId,
      url: finalUrl,
      prompt: videoData.prompt,
      model: videoData.model,
      duration: videoData.duration,
      createdAt: videoMetadata.createdAt,
      userId,
      gcsPath,
    };

  } catch (error) {
    console.error('❌ Failed to store generated video in GCS/Firestore:', error);
    
    // DO NOT fall back to local storage - force retry and fix the issue
    console.error('🚫 NO LOCAL STORAGE FALLBACK - Video generation failed');
    console.error('🔧 Error details:', error);
    
    // Re-throw the error so we can see what's actually failing
    throw new Error(`GCS/Firestore storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieves a list of generated videos from Firestore.
 * @param userId - Optional user ID to filter videos.
 * @returns Array of video metadata.
 */
export async function listGeneratedVideos(userId?: string): Promise<any[]> {
  try {
    let query = firestore.collection('generated-videos').orderBy('createdAt', 'desc');
    
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    const snapshot = await query.get();
    const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Generate fresh signed URLs for each video
    const videosWithUrls = await Promise.all(videos.map(async (video: any) => {
      if (video.gcsPath) {
        try {
          const options = {
            version: 'v4' as const,
            action: 'read' as const,
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
          };
          
          const [signedUrl] = await storage.bucket(bucketName).file(video.gcsPath).getSignedUrl(options);
          return { ...video, url: signedUrl };
        } catch (urlError) {
          console.warn(`⚠️ Could not generate signed URL for video ${video.id}:`, urlError);
          return { ...video, url: video.originalUrl || '' };
        }
      }
      return { ...video, url: video.originalUrl || video.url || '' };
    }));
    
    console.log(`📋 Retrieved ${videosWithUrls.length} videos from Firestore only`);
    return videosWithUrls;
    
  } catch (error) {
    console.error('❌ Failed to list videos from Firestore:', error);
    return [];
  }
}

/**
 * Retrieves a specific generated video by ID.
 * @param videoId - The video ID to retrieve.
 * @returns Video metadata or null if not found.
 */
export async function getGeneratedVideo(videoId: string): Promise<any | null> {
  try {
    const doc = await firestore.collection('generated-videos').doc(videoId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const docData = doc.data();
    const videoData: any = { id: doc.id, ...docData };
    console.log(`📋 Retrieved generated video: ${videoId}`);
    
    // If stored in GCS, generate a fresh signed URL
    if (docData && docData.gcsPath) {
      try {
        const options = {
          version: 'v4' as const,
          action: 'read' as const,
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        };
        
        const [signedUrl] = await storage.bucket(bucketName).file(docData.gcsPath).getSignedUrl(options);
        videoData.url = signedUrl;
        console.log('🔗 Generated fresh signed URL for video playback');
      } catch (urlError) {
        console.warn('⚠️ Could not generate signed URL, using original URL');
      }
    }
    
    return videoData;
    
  } catch (error) {
    console.error('❌ Failed to get generated video:', error);
    return null;
  }
}

/**
 * Deletes a generated video from both GCS and Firestore.
 * @param videoId - The video ID to delete.
 * @param userId - The user ID for security check.
 * @returns Success boolean.
 */
export async function deleteGeneratedVideo(videoId: string, userId?: string): Promise<boolean> {
  try {
    const doc = await firestore.collection('generated-videos').doc(videoId).get();
    
    if (!doc.exists) {
      return false;
    }
    
    const videoData = doc.data();
    
    // Security check
    if (userId && videoData?.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete video belonging to another user');
    }
    
    // Delete from GCS if exists
    if (videoData?.gcsPath) {
      try {
        await storage.bucket(bucketName).file(videoData.gcsPath).delete();
        console.log(`🗑️ Deleted video from GCS: ${videoData.gcsPath}`);
      } catch (gcsError) {
        console.warn('⚠️ Could not delete from GCS (file may not exist):', gcsError);
      }
    }
    
    // Delete from Firestore
    await firestore.collection('generated-videos').doc(videoId).delete();
    console.log(`🗑️ Deleted video metadata from Firestore: ${videoId}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to delete generated video:', error);
    return false;
  }
}

/**
 * Clears all generated videos from both GCS and Firestore.
 * @param userId - Optional user ID to filter by specific user.
 * @returns Number of videos cleared.
 */
export async function clearAllGeneratedVideos(userId?: string): Promise<number> {
  try {
    console.log('🧹 Starting to clear all generated videos...');
    
    // Step 1: Get all video documents from Firestore
    const collection = firestore.collection('generated-videos');
    let query;
    
    if (userId) {
      query = collection.where('userId', '==', userId);
    } else {
      query = collection;
    }
    
    const snapshot = await query.get();
    const videos = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        gcsPath: data.gcsPath,
        userId: data.userId 
      };
    });
    
    console.log(`📋 Found ${videos.length} videos in Firestore to clear`);
    
    let deletedCount = 0;
    
    // Step 2: Delete each video from both GCS and Firestore
    for (const video of videos) {
      try {
        console.log(`🗑️ Deleting video: ${video.id}`);
        
        // Delete from GCS if gcsPath exists
        if (video.gcsPath) {
          try {
            await storage.bucket(bucketName).file(video.gcsPath).delete();
            console.log(`📁 Deleted from GCS: ${video.gcsPath}`);
          } catch (gcsError) {
            console.warn(`⚠️ Could not delete from GCS (file may not exist): ${video.gcsPath}`);
          }
        }
        
        // Delete from Firestore
        await firestore.collection('generated-videos').doc(video.id).delete();
        console.log(`🔥 Deleted from Firestore: ${video.id}`);
        
        deletedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to delete video ${video.id}:`, error);
      }
    }
    
    // Step 3: Clean up any orphaned files in GCS
    console.log('🧹 Checking for orphaned files in GCS...');
    try {
      const pathPrefix = userId ? `generated-videos/${userId}/` : 'generated-videos/';
      const [files] = await storage.bucket(bucketName).getFiles({
        prefix: pathPrefix,
      });
      
      console.log(`📁 Found ${files.length} files in GCS under ${pathPrefix}`);
      
      for (const file of files) {
        try {
          await file.delete();
          console.log(`🗑️ Deleted orphaned file from GCS: ${file.name}`);
          deletedCount++;
        } catch (gcsError) {
          console.warn(`⚠️ Could not delete orphaned file: ${file.name}`, gcsError);
        }
      }
    } catch (gcsListError) {
      console.warn('⚠️ Could not list GCS files for cleanup:', gcsListError);
    }
    
    console.log(`✅ Cleared ${deletedCount} videos and files successfully`);
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Failed to clear generated videos:', error);
    throw error;
  }
}

/**
 * Generates a unique video ID.
 * @param prompt - The video prompt.
 * @param model - The model used.
 * @returns A unique video ID.
 */
function generateVideoId(prompt: string, model: string): string {
  const hash = require('crypto')
    .createHash('md5')
    .update(`${prompt}-${model}-${Date.now()}-${Math.random()}`)
    .digest('hex')
    .substring(0, 12);
  
  return `vid_${hash}`;
}
