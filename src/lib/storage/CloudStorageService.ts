/**
 * Cloud Storage Service (LocalStorage Implementation)
 * Handles image/video upload, storage, and management using localStorage
 */

import { databaseService } from '../database/DatabaseService';

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  metadata?: {
    size: number;
    width?: number;
    height?: number;
    format?: string;
  };
  error?: string;
}

export interface ImageEditOperation {
  type: 'resize' | 'crop' | 'filter' | 'adjust';
  parameters: {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    filter?: 'blur' | 'sharpen' | 'vintage' | 'bw';
    brightness?: number;
    contrast?: number;
    saturation?: number;
  };
}

export interface StoredImage {
  id: string;
  userId: string;
  prompt: string;
  model: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size?: number;
  metadata?: any;
  isPublic: boolean;
  tags: string[];
  parentId?: string;
  editPrompt?: string;
  editOperation?: any;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CloudStorageService {
  private static instance: CloudStorageService;

  static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  /**
   * Upload generated image (localStorage implementation)
   */
  async uploadGeneratedImage(
    imageBuffer: Buffer,
    metadata: {
      userId: string;
      prompt: string;
      model: string;
      width?: number;
      height?: number;
      format?: string;
    }
  ): Promise<UploadResult> {
    try {
      // Convert buffer to base64 for localStorage
      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:image/${metadata.format || 'png'};base64,${base64Data}`;
      
      // Store in database
      console.log('💾 Storing image for userId:', metadata.userId);
      const imageRecord = await databaseService.storeImage({
        userId: metadata.userId,
        prompt: metadata.prompt,
        model: metadata.model,
        url: dataUrl,
        thumbnailUrl: dataUrl, // Same as original for now
        width: metadata.width,
        height: metadata.height,
        size: imageBuffer.length,
        metadata: {
          format: metadata.format,
          stored: 'localStorage'
        },
        isPublic: false,
        tags: this.extractTagsFromPrompt(metadata.prompt)
      });
      console.log('✅ Image stored with ID:', imageRecord?.id);

      console.log('✅ Image stored in localStorage');

      return {
        success: true,
        url: dataUrl,
        thumbnailUrl: dataUrl,
        metadata: {
          id: imageRecord?.id,
          size: imageBuffer.length,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to store image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload user-provided image for editing
   */
  async uploadUserImage(
    imageBuffer: Buffer,
    metadata: {
      userId: string;
      fileName: string;
      contentType: string;
    }
  ): Promise<UploadResult> {
    try {
      // Convert buffer to base64 for localStorage
      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:${metadata.contentType};base64,${base64Data}`;

      return {
        success: true,
        url: dataUrl,
        thumbnailUrl: dataUrl,
        metadata: {
          size: imageBuffer.length
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to upload user image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Edit image and save new version (placeholder)
   */
  async editImage(
    imageUrl: string,
    operations: ImageEditOperation[],
    userId: string
  ): Promise<UploadResult> {
    try {
      // For now, just return the original image URL
      // In a real implementation, this would apply the edit operations
      console.log('🎨 Image editing requested:', operations);
      
      return {
        success: true,
        url: imageUrl, // Return original for now
        metadata: {
          size: 0
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to edit image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store edited image version
   */
  async storeEditedImage(
    imageBuffer: Buffer,
    metadata: {
      userId: string;
      originalImageId: string;
      editPrompt: string;
      editType: string;
      model: string;
      width?: number;
      height?: number;
      format?: string;
    }
  ): Promise<UploadResult & { imageId?: string; version?: number }> {
    try {
      // Convert buffer to base64 for localStorage
      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:image/${metadata.format || 'png'};base64,${base64Data}`;
      
      // Get the original image to determine version number
      const originalImage = await databaseService.getImageById(metadata.originalImageId);
      const nextVersion = originalImage ? (originalImage.version || 1) + 1 : 2;
      
      // Store edited image in database
      const imageRecord = await databaseService.storeImage({
        userId: metadata.userId,
        prompt: originalImage?.prompt || '',
        model: metadata.model,
        url: dataUrl,
        thumbnailUrl: dataUrl,
        width: metadata.width,
        height: metadata.height,
        size: imageBuffer.length,
        metadata: {
          format: metadata.format,
          stored: 'localStorage',
          editType: metadata.editType
        },
        isPublic: false,
        tags: originalImage?.tags || [],
        parentId: metadata.originalImageId,
        editPrompt: metadata.editPrompt,
        editOperation: {
          type: metadata.editType,
          prompt: metadata.editPrompt,
          model: metadata.model
        },
        version: nextVersion
      });

      console.log('✅ Edited image stored in localStorage');

      return {
        success: true,
        url: dataUrl,
        thumbnailUrl: dataUrl,
        imageId: imageRecord?.id,
        version: nextVersion,
        metadata: {
          size: imageBuffer.length,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to store edited image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get image by ID
   */
  async getImageById(imageId: string): Promise<StoredImage | null> {
    try {
      return await databaseService.getImageById(imageId);
    } catch (error) {
      console.error('❌ Failed to get image by ID:', error);
      return null;
    }
  }

  /**
   * Get user's stored images
   */
  async getUserImages(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<StoredImage[]> {
    try {
      console.log('🔍 CloudStorageService: Getting images for userId:', userId);
      const images = await databaseService.getUserImages(userId, limit, offset);
      console.log('📸 CloudStorageService: Found images:', images.length);
      return images;
    } catch (error) {
      console.error('❌ Failed to get user images:', error);
      return [];
    }
  }

  /**
   * Get image versions (all versions of an image)
   */
  async getImageVersions(imageId: string, userId: string): Promise<StoredImage[]> {
    try {
      return await databaseService.getImageVersions(imageId, userId);
    } catch (error) {
      console.error('❌ Failed to get image versions:', error);
      return [];
    }
  }

  /**
   * Delete image from storage and database
   */
  async deleteImage(imageId: string, userId: string): Promise<boolean> {
    try {
      // In localStorage implementation, just remove from database
      await databaseService.deleteImage(imageId);
      console.log('✅ Image deleted from localStorage');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Extract tags from prompt text
   */
  private extractTagsFromPrompt(prompt: string): string[] {
    // Simple tag extraction
    const commonTags = [
      'portrait', 'landscape', 'abstract', 'digital art', 'realistic',
      'cartoon', 'anime', 'photography', 'painting', 'concept art',
      'character', 'environment', 'sci-fi', 'fantasy', 'nature'
    ];

    const promptLower = prompt.toLowerCase();
    return commonTags.filter(tag => promptLower.includes(tag));
  }
}

// Export singleton instance
export const cloudStorageService = CloudStorageService.getInstance();