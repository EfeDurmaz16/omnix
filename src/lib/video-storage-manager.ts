import { generateUploadUrl, deleteGeneratedVideo, getPlaybackUrl } from './gcp-storage';

export interface VideoMetadata {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  duration?: number;
  resolution?: {
    width: number;
    height: number;
  };
  format: string;
  bitrate?: number;
  frameRate?: number;
  codec?: string;
  uploadedAt: Date;
  userId: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  thumbnailUrl?: string;
  streamingUrl?: string;
  downloadUrl?: string;
  tags?: string[];
  description?: string;
  isPublic: boolean;
  generationModel?: string;
  generationPrompt?: string;
  processingProgress?: number;
  errorMessage?: string;
}

export interface VideoUploadOptions {
  generateThumbnail?: boolean;
  optimizeForStreaming?: boolean;
  watermark?: boolean;
  maxDuration?: number;
  maxSize?: number;
  allowedFormats?: string[];
}

export interface VideoProcessingJob {
  id: string;
  videoId: string;
  type: 'thumbnail' | 'transcode' | 'optimize' | 'watermark';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  outputUrl?: string;
}

class VideoStorageManager {
  private videos: Map<string, VideoMetadata> = new Map();
  private processingJobs: Map<string, VideoProcessingJob> = new Map();
  
  constructor() {
    this.loadFromStorage();
  }

  // Video Upload Management
  async uploadVideo(
    file: File, 
    userId: string, 
    options: VideoUploadOptions = {}
  ): Promise<VideoMetadata> {
    const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = `videos/${userId}/${videoId}/${file.name}`;

    // Validate file
    await this.validateVideoFile(file, options);

    // Create initial metadata
    const metadata: VideoMetadata = {
      id: videoId,
      filename,
      originalName: file.name,
      size: file.size,
      format: this.getFileFormat(file.name),
      uploadedAt: new Date(),
      userId,
      status: 'uploading',
      isPublic: false,
      processingProgress: 0
    };

    this.videos.set(videoId, metadata);
    this.saveToStorage();

    try {
      // For now, create a mock upload URL (in production, use actual cloud storage)
      const uploadUrl = URL.createObjectURL(file);
      
      // Update metadata with download URL
      metadata.downloadUrl = uploadUrl;
      metadata.status = 'processing';
      metadata.processingProgress = 25;
      
      this.videos.set(videoId, metadata);
      this.saveToStorage();

      // Start processing pipeline
      await this.processVideo(videoId, options);

      return metadata;
    } catch (error) {
      metadata.status = 'failed';
      metadata.errorMessage = error instanceof Error ? error.message : 'Upload failed';
      this.videos.set(videoId, metadata);
      this.saveToStorage();
      throw error;
    }
  }

  // Video Processing Pipeline
  private async processVideo(videoId: string, options: VideoUploadOptions): Promise<void> {
    const metadata = this.videos.get(videoId);
    if (!metadata) throw new Error('Video not found');

    try {
      // Extract metadata
      await this.extractVideoMetadata(videoId);
      metadata.processingProgress = 50;
      this.videos.set(videoId, metadata);

      // Generate thumbnail if requested
      if (options.generateThumbnail !== false) {
        await this.generateThumbnail(videoId);
        metadata.processingProgress = 70;
        this.videos.set(videoId, metadata);
      }

      // Optimize for streaming if requested
      if (options.optimizeForStreaming) {
        await this.optimizeForStreaming(videoId);
        metadata.processingProgress = 90;
        this.videos.set(videoId, metadata);
      }

      // Mark as ready
      metadata.status = 'ready';
      metadata.processingProgress = 100;
      this.videos.set(videoId, metadata);
      this.saveToStorage();

    } catch (error) {
      metadata.status = 'failed';
      metadata.errorMessage = error instanceof Error ? error.message : 'Processing failed';
      this.videos.set(videoId, metadata);
      this.saveToStorage();
      throw error;
    }
  }

  // Extract video metadata using File API and video element
  private async extractVideoMetadata(videoId: string): Promise<void> {
    const metadata = this.videos.get(videoId);
    if (!metadata || !metadata.downloadUrl) return;

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        metadata.duration = video.duration;
        metadata.resolution = {
          width: video.videoWidth,
          height: video.videoHeight
        };
        
        this.videos.set(videoId, metadata);
        resolve();
      };

      video.onerror = () => {
        reject(new Error('Failed to extract video metadata'));
      };

      video.src = metadata.downloadUrl || '';
    });
  }

  // Generate thumbnail
  private async generateThumbnail(videoId: string): Promise<void> {
    const metadata = this.videos.get(videoId);
    if (!metadata || !metadata.downloadUrl) return;

    const jobId = `thumb_${videoId}`;
    const job: VideoProcessingJob = {
      id: jobId,
      videoId,
      type: 'thumbnail',
      status: 'processing',
      progress: 0
    };

    this.processingJobs.set(jobId, job);

    try {
      // Create video element for thumbnail generation
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.currentTime = Math.min(video.duration * 0.1, 5); // 10% into video or 5 seconds
        };

        video.onseeked = async () => {
          try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            // Convert to blob
            canvas.toBlob(async (blob) => {
              if (!blob) {
                reject(new Error('Failed to generate thumbnail'));
                return;
              }

              try {
                // Create thumbnail URL (in production, upload to cloud storage)
                const thumbnailFilename = `thumbnails/${metadata.userId}/${videoId}/thumbnail.jpg`;
                const thumbnailUrl = URL.createObjectURL(blob);
                
                metadata.thumbnailUrl = thumbnailUrl;
                job.status = 'completed';
                job.progress = 100;
                job.outputUrl = thumbnailUrl;
                job.completedAt = new Date();

                this.videos.set(videoId, metadata);
                this.processingJobs.set(jobId, job);
                
                resolve(undefined);
              } catch (error) {
                reject(error);
              }
            }, 'image/jpeg', 0.8);
          } catch (error) {
            reject(error);
          }
        };

        video.onerror = () => reject(new Error('Failed to load video for thumbnail'));
        video.src = metadata.downloadUrl || '';
      });

    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Thumbnail generation failed';
      this.processingJobs.set(jobId, job);
      throw error;
    }
  }

  // Optimize for streaming (placeholder - would use actual video processing service)
  private async optimizeForStreaming(videoId: string): Promise<void> {
    const metadata = this.videos.get(videoId);
    if (!metadata) return;

    // This would typically use a service like FFmpeg or cloud video processing
    // For now, we'll simulate the process
    
    const jobId = `stream_${videoId}`;
    const job: VideoProcessingJob = {
      id: jobId,
      videoId,
      type: 'optimize',
      status: 'processing',
      progress: 0,
      startedAt: new Date()
    };

    this.processingJobs.set(jobId, job);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For now, use the same URL (in production, this would be an optimized version)
    metadata.streamingUrl = metadata.downloadUrl;
    
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();
    job.outputUrl = metadata.streamingUrl;

    this.videos.set(videoId, metadata);
    this.processingJobs.set(jobId, job);
  }

  // File validation
  private async validateVideoFile(file: File, options: VideoUploadOptions): Promise<void> {
    const maxSize = options.maxSize || 500 * 1024 * 1024; // 500MB default
    const allowedFormats = options.allowedFormats || ['mp4', 'webm', 'mov', 'avi', 'mkv'];

    if (file.size > maxSize) {
      throw new Error(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`);
    }

    const format = this.getFileFormat(file.name);
    if (!allowedFormats.includes(format)) {
      throw new Error(`Format ${format} not supported. Allowed: ${allowedFormats.join(', ')}`);
    }

    // Additional validation for duration (if specified)
    if (options.maxDuration) {
      const duration = await this.getVideoDuration(file);
      if (duration > options.maxDuration) {
        throw new Error(`Video duration exceeds limit of ${options.maxDuration} seconds`);
      }
    }
  }

  // Get video duration from file
  private async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  // Utility methods
  private getFileFormat(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension || '';
  }

  // CRUD operations
  getVideo(videoId: string): VideoMetadata | undefined {
    return this.videos.get(videoId);
  }

  getUserVideos(userId: string): VideoMetadata[] {
    return Array.from(this.videos.values())
      .filter(video => video.userId === userId)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  getPublicVideos(): VideoMetadata[] {
    return Array.from(this.videos.values())
      .filter(video => video.isPublic && video.status === 'ready')
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async deleteVideo(videoId: string): Promise<void> {
    const metadata = this.videos.get(videoId);
    if (!metadata) throw new Error('Video not found');

    try {
      // Delete from cloud storage (in production, implement actual deletion)
      if (metadata.downloadUrl) {
        // Mock deletion - in production use actual cloud storage deletion
        URL.revokeObjectURL(metadata.downloadUrl);
      }

      // Delete thumbnail if exists
      if (metadata.thumbnailUrl) {
        // Mock deletion - in production use actual cloud storage deletion
        URL.revokeObjectURL(metadata.thumbnailUrl);
      }

      // Remove from local storage
      this.videos.delete(videoId);
      
      // Remove related processing jobs
      Array.from(this.processingJobs.keys())
        .filter(jobId => jobId.includes(videoId))
        .forEach(jobId => this.processingJobs.delete(jobId));

      this.saveToStorage();
    } catch (error) {
      throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  updateVideoMetadata(videoId: string, updates: Partial<VideoMetadata>): void {
    const metadata = this.videos.get(videoId);
    if (!metadata) throw new Error('Video not found');

    // Don't allow updating system fields
    const { id, filename, uploadedAt, userId, status, processingProgress, ...allowedUpdates } = updates;
    
    Object.assign(metadata, allowedUpdates);
    this.videos.set(videoId, metadata);
    this.saveToStorage();
  }

  getProcessingStatus(videoId: string): VideoProcessingJob[] {
    return Array.from(this.processingJobs.values())
      .filter(job => job.videoId === videoId);
  }

  // Storage persistence
  private saveToStorage(): void {
    try {
      const data = {
        videos: Array.from(this.videos.entries()),
        jobs: Array.from(this.processingJobs.entries()),
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('omnix_video_storage', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save video storage data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('omnix_video_storage');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restore videos
        if (data.videos) {
          this.videos = new Map(data.videos.map(([id, metadata]: [string, any]) => [
            id, 
            { ...metadata, uploadedAt: new Date(metadata.uploadedAt) }
          ]));
        }

        // Restore jobs
        if (data.jobs) {
          this.processingJobs = new Map(data.jobs.map(([id, job]: [string, any]) => [
            id,
            {
              ...job,
              startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
              completedAt: job.completedAt ? new Date(job.completedAt) : undefined
            }
          ]));
        }
      }
    } catch (error) {
      console.error('Failed to load video storage data:', error);
    }
  }

  // Statistics
  getStorageStats(): {
    totalVideos: number;
    totalSize: number;
    readyVideos: number;
    processingVideos: number;
    failedVideos: number;
  } {
    const videos = Array.from(this.videos.values());
    
    return {
      totalVideos: videos.length,
      totalSize: videos.reduce((sum, video) => sum + video.size, 0),
      readyVideos: videos.filter(v => v.status === 'ready').length,
      processingVideos: videos.filter(v => v.status === 'processing').length,
      failedVideos: videos.filter(v => v.status === 'failed').length
    };
  }
}

// Export singleton instance
export const videoStorageManager = new VideoStorageManager(); 