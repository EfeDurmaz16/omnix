/**
 * Database Service (LocalStorage + File Implementation)
 * Manages user data, credits, and transactions using localStorage (client) or file system (server)
 */
export interface UserData {
  id: string;
  clerkId: string;
  email: string;
  name?: string;
  avatar?: string;
  plan: 'FREE' | 'PRO' | 'ULTRA' | 'ENTERPRISE';
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditTransactionData {
  id: string;
  userId: string;
  amount: number;
  type: 'PURCHASE' | 'USAGE' | 'REFUND' | 'BONUS' | 'ADJUSTMENT';
  description: string;
  metadata?: any;
  createdAt: Date;
}

export interface ImageData {
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

export class DatabaseService {
  private static instance: DatabaseService;
  private dataDir: string;

  constructor() {
    // Create data directory for server-side storage
    this.dataDir = '';
    if (typeof window === 'undefined') {
      try {
        const path = require('path');
        const fs = require('fs');
        this.dataDir = path.join(process.cwd(), '.data');
        if (!fs.existsSync(this.dataDir)) {
          fs.mkdirSync(this.dataDir, { recursive: true });
        }
      } catch (error) {
        console.warn('Server-side storage not available:', error);
      }
    }
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Create or update user in localStorage (fallback)
   */
  async upsertUser(userData: {
    clerkId: string;
    email: string;
    name?: string;
    avatar?: string;
  }): Promise<UserData> {
    try {
      const existingUser = await this.getUserByClerkId(userData.clerkId);
      
      const user: UserData = {
        id: existingUser?.id || `user_${Date.now()}`,
        clerkId: userData.clerkId,
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
        plan: existingUser?.plan || 'FREE',
        credits: existingUser?.credits || 1500,
        createdAt: existingUser?.createdAt || new Date(),
        updatedAt: new Date()
      };

      // Store in localStorage (if available)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`aspendos_user_${userData.clerkId}`, JSON.stringify(user));
      }
      
      console.log('✅ User upserted in localStorage:', user);
      return user;
    } catch (error) {
      console.error('Failed to upsert user:', error);
      throw error;
    }
  }

  /**
   * Get user by Clerk ID from localStorage
   */
  async getUserByClerkId(clerkId: string): Promise<UserData | null> {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available');
        return null;
      }
      
      const stored = localStorage.getItem(`aspendos_user_${clerkId}`);
      if (stored) {
        const user = JSON.parse(stored);
        user.createdAt = new Date(user.createdAt);
        user.updatedAt = new Date(user.updatedAt);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Update user credits in localStorage
   */
  async updateUserCredits(
    clerkId: string, 
    newCredits: number,
    transaction?: {
      amount: number;
      type: 'PURCHASE' | 'USAGE' | 'REFUND' | 'BONUS' | 'ADJUSTMENT';
      description: string;
      metadata?: any;
    }
  ): Promise<UserData | null> {
    try {
      const user = await this.getUserByClerkId(clerkId);
      if (!user) {
        console.error('User not found for credit update');
        return null;
      }

      // Update user credits
      user.credits = newCredits;
      user.updatedAt = new Date();
      
      // Store updated user
      localStorage.setItem(`aspendos_user_${clerkId}`, JSON.stringify(user));
      
      // Store credit transaction if provided
      if (transaction) {
        const transactionData: CreditTransactionData = {
          id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description,
          metadata: transaction.metadata || {},
          createdAt: new Date()
        };

        // Get existing transactions
        const existingTransactions = this.getStoredTransactions(clerkId);
        existingTransactions.push(transactionData);
        
        // Keep only last 200 transactions
        if (existingTransactions.length > 200) {
          existingTransactions.splice(0, existingTransactions.length - 200);
        }
        
        localStorage.setItem(`aspendos_transactions_${clerkId}`, JSON.stringify(existingTransactions));
      }

      console.log('✅ User credits updated in localStorage:', newCredits);
      return user;
    } catch (error) {
      console.error('Failed to update user credits:', error);
      return null;
    }
  }

  /**
   * Add credits to user account
   */
  async addCredits(
    clerkId: string,
    amount: number,
    description: string = 'Credit addition',
    metadata?: any
  ): Promise<boolean> {
    try {
      const user = await this.getUserByClerkId(clerkId);
      if (!user) {
        console.error('User not found for credit addition');
        return false;
      }

      const newCredits = user.credits + amount;
      const result = await this.updateUserCredits(clerkId, newCredits, {
        amount,
        type: 'PURCHASE',
        description,
        metadata
      });

      return result !== null;
    } catch (error) {
      console.error('Failed to add credits:', error);
      return false;
    }
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(
    clerkId: string,
    amount: number,
    description: string = 'API usage',
    metadata?: any
  ): Promise<boolean> {
    try {
      const user = await this.getUserByClerkId(clerkId);
      if (!user) {
        console.error('User not found for credit deduction');
        return false;
      }

      if (user.credits < amount) {
        console.warn('Insufficient credits for deduction');
        return false;
      }

      const newCredits = user.credits - amount;
      const result = await this.updateUserCredits(clerkId, newCredits, {
        amount: -amount,
        type: 'USAGE',
        description,
        metadata
      });

      return result !== null;
    } catch (error) {
      console.error('Failed to deduct credits:', error);
      return false;
    }
  }

  /**
   * Get user's credit transaction history
   */
  async getCreditTransactions(
    clerkId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CreditTransactionData[]> {
    try {
      const transactions = this.getStoredTransactions(clerkId);
      return transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to get credit transactions:', error);
      return [];
    }
  }

  /**
   * Store generated image (localStorage fallback)
   */
  async storeImage(imageData: {
    userId: string;
    prompt: string;
    model: string;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    size?: number;
    metadata?: any;
    isPublic?: boolean;
    tags?: string[];
    parentId?: string;
    editPrompt?: string;
    editOperation?: any;
    version?: number;
  }): Promise<ImageData | null> {
    try {
      const image: ImageData = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: imageData.userId,
        prompt: imageData.prompt,
        model: imageData.model,
        url: imageData.url,
        thumbnailUrl: imageData.thumbnailUrl,
        width: imageData.width,
        height: imageData.height,
        size: imageData.size,
        metadata: imageData.metadata || {},
        isPublic: imageData.isPublic || false,
        tags: imageData.tags || [],
        parentId: imageData.parentId,
        editPrompt: imageData.editPrompt,
        editOperation: imageData.editOperation,
        version: imageData.version || 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Get existing images
      const existingImages = this.getStoredImages(imageData.userId);
      existingImages.unshift(image); // Add to beginning
      
      // Keep only last 100 images per user
      if (existingImages.length > 100) {
        existingImages.splice(100);
      }
      
      this.setStoredImages(imageData.userId, existingImages);
      
      console.log('✅ Image stored in localStorage');
      return image;
    } catch (error) {
      console.error('Failed to store image:', error);
      return null;
    }
  }

  /**
   * Get user's images
   */
  async getUserImages(
    userIdOrClerkId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ImageData[]> {
    try {
      const images = this.getStoredImages(userIdOrClerkId);
      return images.slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to get user images:', error);
      return [];
    }
  }

  /**
   * Update image
   */
  async updateImage(
    imageId: string,
    updates: {
      url?: string;
      thumbnailUrl?: string;
      metadata?: any;
      tags?: string[];
      isPublic?: boolean;
    }
  ): Promise<ImageData | null> {
    try {
      // This would need to iterate through all users' images in a real implementation
      // For now, return null as a placeholder
      console.warn('Image update not implemented in localStorage fallback');
      return null;
    } catch (error) {
      console.error('Failed to update image:', error);
      return null;
    }
  }

  /**
   * Get image by ID
   */
  async getImageById(imageId: string): Promise<ImageData | null> {
    try {
      // Search through all stored images to find the one with matching ID
      // In a real database, this would be much more efficient
      
      // First check if we can get all localStorage keys
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available');
        return null;
      }

      const allKeys = Object.keys(localStorage);
      const userImageKeys = allKeys.filter(key => key.startsWith('aspendos_images_'));
      
      console.log('🔍 Searching for image ID:', imageId);
      console.log('📋 Found user image keys:', userImageKeys.length);
      
      for (const userKey of userImageKeys) {
        try {
          const userId = userKey.replace('aspendos_images_', '');
          const images = this.getStoredImages(userId);
          console.log(`🔍 Searching in ${userId} images:`, images.length);
          
          const foundImage = images.find(img => img.id === imageId);
          if (foundImage) {
            console.log('✅ Found image:', foundImage.id);
            return foundImage;
          }
        } catch (keyError) {
          console.warn('Error processing key:', userKey, keyError);
          continue;
        }
      }
      
      console.warn('❌ Image not found:', imageId);
      return null;
    } catch (error) {
      console.error('Failed to get image by ID:', error);
      return null;
    }
  }

  /**
   * Get image versions (all versions of an image)
   */
  async getImageVersions(imageId: string, userIdOrClerkId: string): Promise<ImageData[]> {
    try {
      const images = this.getStoredImages(userIdOrClerkId);
      
      // Find the original image or any image with this ID
      const targetImage = images.find(img => img.id === imageId || img.parentId === imageId);
      if (!targetImage) return [];

      // Get the root parent ID
      const rootId = targetImage.parentId || targetImage.id;
      
      // Return all versions of this image family
      return images.filter(img => img.id === rootId || img.parentId === rootId)
        .sort((a, b) => a.version - b.version);
    } catch (error) {
      console.error('Failed to get image versions:', error);
      return [];
    }
  }

  /**
   * Delete image
   */
  async deleteImage(imageId: string): Promise<boolean> {
    try {
      // This would need to iterate through all users' images in a real implementation
      // For now, return false as a placeholder
      console.warn('Image delete not implemented in localStorage fallback');
      return false;
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Track API usage (localStorage fallback)
   */
  async trackApiUsage(usageData: {
    userId: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    requestType: string;
    endpoint: string;
    responseTime?: number;
    metadata?: any;
  }): Promise<boolean> {
    try {
      const usage = {
        id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...usageData,
        totalTokens: usageData.inputTokens + usageData.outputTokens,
        createdAt: new Date()
      };

      // Get existing usage data
      const existingUsage = this.getStoredUsage(usageData.userId);
      existingUsage.push(usage);
      
      // Keep only last 500 usage records
      if (existingUsage.length > 500) {
        existingUsage.splice(0, existingUsage.length - 500);
      }
      
      localStorage.setItem(`aspendos_usage_${usageData.userId}`, JSON.stringify(existingUsage));
      
      return true;
    } catch (error) {
      console.error('Failed to track API usage:', error);
      return false;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(clerkId: string, days: number = 30): Promise<{
    totalCost: number;
    totalRequests: number;
    totalTokens: number;
    topModels: Array<{ model: string; requests: number; cost: number }>;
  }> {
    try {
      const usage = this.getStoredUsage(clerkId);
      const since = new Date();
      since.setDate(since.getDate() - days);

      const recentUsage = usage.filter(u => new Date(u.createdAt) >= since);
      
      const totalCost = recentUsage.reduce((sum, u) => sum + u.cost, 0);
      const totalRequests = recentUsage.length;
      const totalTokens = recentUsage.reduce((sum, u) => sum + u.totalTokens, 0);

      // Calculate top models
      const modelStats = recentUsage.reduce((acc, u) => {
        if (!acc[u.model]) {
          acc[u.model] = { model: u.model, requests: 0, cost: 0 };
        }
        acc[u.model].requests++;
        acc[u.model].cost += u.cost;
        return acc;
      }, {} as Record<string, { model: string; requests: number; cost: number }>);

      const topModels = Object.values(modelStats)
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5);

      return { totalCost, totalRequests, totalTokens, topModels };
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return { totalCost: 0, totalRequests: 0, totalTokens: 0, topModels: [] };
    }
  }

  /**
   * Update user plan
   */
  async updateUserPlan(
    clerkId: string,
    plan: 'FREE' | 'PRO' | 'ULTRA' | 'ENTERPRISE'
  ): Promise<boolean> {
    try {
      const user = await this.getUserByClerkId(clerkId);
      if (!user) return false;

      user.plan = plan;
      user.updatedAt = new Date();
      
      localStorage.setItem(`aspendos_user_${clerkId}`, JSON.stringify(user));
      
      return true;
    } catch (error) {
      console.error('Failed to update user plan:', error);
      return false;
    }
  }

  /**
   * Sync localStorage data (no-op for localStorage implementation)
   */
  async syncLocalStorageToDatabase(clerkId: string): Promise<boolean> {
    // No-op for localStorage implementation
    console.log('✅ LocalStorage sync: no action needed');
    return true;
  }

  // Helper methods
  private getStoredTransactions(clerkId: string): CreditTransactionData[] {
    try {
      const stored = localStorage.getItem(`aspendos_transactions_${clerkId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private getStoredImages(userIdOrClerkId: string): ImageData[] {
    try {
      const data = this.getStoredData(`images_${userIdOrClerkId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get stored images:', error);
      return [];
    }
  }

  private setStoredImages(userIdOrClerkId: string, images: ImageData[]): void {
    try {
      this.setStoredData(`images_${userIdOrClerkId}`, JSON.stringify(images));
    } catch (error) {
      console.error('Failed to store images:', error);
    }
  }

  private getStoredData(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Client-side: use localStorage
        return localStorage.getItem(`aspendos_${key}`);
      } else if (typeof window === 'undefined') {
        // Server-side: use file system only if we're actually on server
        try {
          const path = require('path');
          const fs = require('fs');
          const filePath = path.join(this.dataDir, `${key}.json`);
          if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
          }
        } catch (fsError) {
          console.warn('Server-side file storage not available:', fsError);
        }
        return null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get stored data:', error);
      return null;
    }
  }

  private setStoredData(key: string, data: string): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Client-side: use localStorage
        localStorage.setItem(`aspendos_${key}`, data);
      } else if (typeof window === 'undefined') {
        // Server-side: use file system only if we're actually on server
        try {
          const path = require('path');
          const fs = require('fs');
          const filePath = path.join(this.dataDir, `${key}.json`);
          fs.writeFileSync(filePath, data, 'utf8');
        } catch (fsError) {
          console.warn('Server-side file storage not available:', fsError);
        }
      }
    } catch (error) {
      console.error('Failed to set stored data:', error);
    }
  }

  private getStoredUsage(clerkId: string): any[] {
    try {
      const stored = localStorage.getItem(`aspendos_usage_${clerkId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();