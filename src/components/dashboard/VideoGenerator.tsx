'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Download, Play, Video, RefreshCw, Trash2 } from 'lucide-react';
import { AI_MODELS } from '@/lib/constants';
import { GenerationResult } from '@/lib/types';

interface StoredVideo {
  id: string;
  url: string;
  prompt: string;
  model: string;
  duration: number;
  createdAt: string;
  userId?: string;
  size: number;
  format: string;
}

export function VideoGenerator() {
  const { updateCredits } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('veo-3.0-generate-preview');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<GenerationResult[]>([]);
  const [storedVideos, setStoredVideos] = useState<StoredVideo[]>([]);
  const [lastError, setLastError] = useState<string>('');
  const [loadingStoredVideos, setLoadingStoredVideos] = useState(true);

  const videoModels = AI_MODELS.filter(model => model.type === 'video' && model.available);

  // Load stored videos on component mount
  useEffect(() => {
    loadStoredVideos();
  }, []);

  const loadStoredVideos = async () => {
    try {
      setLoadingStoredVideos(true);
      console.log('📹 Loading stored videos...');
      
      const response = await fetch('/api/videos');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setStoredVideos(data.data);
        console.log('✅ Loaded stored videos:', data.data.length);
        
        // Convert stored videos to GenerationResult format for display
        const convertedVideos: GenerationResult[] = data.data.map((video: StoredVideo) => ({
          id: video.id,
          type: 'video' as const,
          content: `Generated with ${video.model}`,
          url: video.url,
          model: video.model,
          prompt: video.prompt,
          userId: video.userId || 'current-user',
          tokensUsed: 50,
          createdAt: new Date(video.createdAt)
        }));
        
        // Ensure no duplicates by ID
        const uniqueVideos = convertedVideos.filter((video, index, self) => 
          index === self.findIndex(v => v.id === video.id)
        );
        
        console.log(`📋 Setting ${uniqueVideos.length} unique videos (filtered from ${convertedVideos.length})`);
        setGeneratedVideos(uniqueVideos);
      }
    } catch (error) {
      console.error('❌ Failed to load stored videos:', error);
    } finally {
      setLoadingStoredVideos(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setLastError('');

    try {
      console.log('🎬 Starting video generation with:', { prompt, model: selectedModel });
      
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: selectedModel,
          duration: 5, // 5 seconds for MVP
          imageUrl: imageUrl || undefined // Include image URL for image-to-video models
        }),
      });

      console.log('📡 Video API response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If response is not JSON, create a basic error object
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('❌ Video API Error:', errorData);
        
        // Extract the actual error message for better user feedback
        const errorMessage = errorData?.details || errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Video generation response:', data);

      if (data.success && data.data) {
        console.log('🎯 Video generation completed:', data.data);
        console.log('🔗 Video URL:', data.data.url);
        
        // Update credits first
        updateCredits(50);
        
        // Force reload stored videos from API to get the latest data
        // This will automatically include the newly generated video
        console.log('🔄 Refreshing stored videos after generation...');
        await loadStoredVideos();
        
        console.log('✅ Video successfully added to gallery');
        
        // Clear the form
        setPrompt('');
        setImageUrl('');
        
        // Show success message
        alert(`🎉 Video generated successfully!\n\nPrompt: "${prompt}"\nModel: ${selectedModel}\n\nCheck the video gallery below.`);
        
      } else {
        console.error('❌ Invalid video response format:', data);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Failed to generate video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      
      // Show user-friendly error with better formatting
      if (errorMessage.includes('⏱️') || errorMessage.includes('quota limit reached')) {
        // This is a quota error - API access works but need more quota
        alert(
          `⏱️ Quota Limit Reached - Great News!\n\n` +
          `🎉 Your Veo API access is working! You just need more quota.\n\n` +
          `Your prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\n` +
          `Quick fix:\n` +
          `1. Go to Google Cloud Console\n` +
          `2. Navigate to Vertex AI → Quotas\n` +
          `3. Find "Veo" models and request quota increase\n` +
          `4. Usually approved within 24 hours\n\n` +
          `Then try generating your video again!`
        );
      } else if (errorMessage.includes('🚫') || errorMessage.includes('requires special API access')) {
        // This is a Veo access error - show helpful guidance
        alert(
          `🚫 Video Generation Unavailable\n\n` +
          `The Veo video generation API requires special access from Google Cloud. ` +
          `This is normal - Google Veo is a premium service that requires approval.\n\n` +
          `Your prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\n` +
          `To enable real video generation:\n` +
          `1. Contact Google Cloud support\n` +
          `2. Request access to Veo API\n` +
          `3. We'll connect it automatically once approved`
        );
      } else if (errorMessage.includes('Google Cloud Veo service is experiencing internal issues')) {
        // Google Cloud infrastructure issue
        alert(
          `🔧 Google Cloud Infrastructure Issue\n\n` +
          `The Google Cloud Veo service is experiencing temporary internal issues. This is not a problem with your setup.\n\n` +
          `Your prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\n` +
          `What to do:\n` +
          `1. ✅ Try the "Wavespeed" model instead (it's working reliably)\n` +
          `2. ⏰ Or wait 15-30 minutes and try Veo again\n` +
          `3. 📊 Check Google Cloud status page for updates\n\n` +
          `Your application is working correctly - this is a temporary Google issue.`
        );
      } else if (errorMessage.includes('Wavespeed')) {
        // Seedance-specific error
        alert(
          `🎬 Wavespeed Video Generation Error\n\n` +
          `Error: ${errorMessage}\n\n` +
          `This could be due to:\n` +
          `1. API quota limits\n` +
          `2. Invalid image URL (for image-to-video)\n` +
          `3. Server processing issues\n\n` +
          `Try again with a different prompt or image.`
        );
      } else {
        alert(`Failed to generate video: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (videoUrl: string, prompt: string) => {
    const element = document.createElement('a');
    element.href = videoUrl;
    element.download = `video-${Date.now()}.mp4`;
    element.click();
  };

  // Add video delete function
  const handleDeleteVideo = async (videoId: string) => {
    try {
      console.log('🗑️ Deleting video:', videoId);
      
      const response = await fetch('/api/videos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Video deleted successfully');
        
        // Remove from local state
        setGeneratedVideos(prev => prev.filter(v => v.id !== videoId));
        setStoredVideos(prev => prev.filter(v => v.id !== videoId));
        
        // Refresh the video list to ensure consistency
        await loadStoredVideos();
        
        alert('🗑️ Video deleted successfully!');
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('❌ Failed to delete video:', error);
      alert(`❌ Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Keep the existing functions but comment them out from UI
  const addTestVideo = () => {
    const testVideo: GenerationResult = {
      id: `test_${Date.now()}`,
      type: 'video',
      content: 'Test video for debugging',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      model: 'test-model',
      prompt: 'A test video for debugging purposes',
      userId: 'test-user',
      tokensUsed: 0,
      createdAt: new Date()
    };
    
    setGeneratedVideos(prev => [testVideo, ...prev]);
    console.log('🧪 Test video added for debugging');
  };

  const testVideoStorage = async () => {
    try {
      console.log('🧪 Testing video storage...');
      
      const response = await fetch('/api/videos/test-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Storage test passed:', result);
        alert(`✅ Storage test passed!\n\nTest results:\n${JSON.stringify(result.data, null, 2)}`);
      } else {
        console.error('❌ Storage test failed:', result);
        alert(`❌ Storage test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Storage test error:', error);
      alert(`❌ Storage test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const migrateLocalVideos = async () => {
    try {
      console.log('🔄 Starting migration to cloud storage...');
      
      const response = await fetch('/api/videos/fix-missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Migration completed:', result);
        alert(`✅ Migration completed!\n\nResults:\n${JSON.stringify(result.data, null, 2)}`);
        
        // Refresh stored videos
        await loadStoredVideos();
      } else {
        console.error('❌ Migration failed:', result);
        alert(`❌ Migration failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Migration error:', error);
      alert(`❌ Migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to clear all stored videos
  const clearStoredVideos = async () => {
    if (!confirm('Are you sure you want to clear all stored videos? This cannot be undone.')) {
      return;
    }
    
    try {
      console.log('🧹 Clearing all stored videos...');
      
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ All videos cleared');
        alert('🧹 All stored videos cleared!');
        
        // Clear local state
        setGeneratedVideos([]);
        setStoredVideos([]);
        
        // Refresh the video list
        await loadStoredVideos();
      } else {
        console.error('❌ Clear failed:', result);
        alert(`❌ Clear failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Clear error:', error);
      alert(`❌ Clear error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5" />
            <span>Generate Videos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate..."
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground">
              Generated videos will be 5 seconds long for the MVP. More options coming soon!
            </p>
          </div>

          {/* Image URL input for image-to-video models */}
          {selectedModel === 'seedance-v1-pro-i2v-720p' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Image URL <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/your-image.jpg (Required for Wavespeed Seedance model)"
                className="min-h-16"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                🖼️ Wavespeed Seedance is an image-to-video model. Provide a starting image URL to animate.
              </p>
              <div className="text-xs text-muted-foreground mt-1">
                <strong>Example image URL:</strong> 
                <button 
                  onClick={() => setImageUrl('https://d2g64w682n9w0w.cloudfront.net/media/images/1750742499545258689_aeXmGbsM.jpg')}
                  className="ml-1 text-blue-500 hover:underline"
                >
                  Girl playing piano
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Model:</span>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {videoModels.map((model) => {
                    const isRealModel = model.id.startsWith('veo-') || model.id.startsWith('seedance-');
                    return (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center space-x-2">
                          <span>{model.name}</span>
                          {isRealModel ? (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                              ✅ 100% Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                              🚧 Mock
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            50 credits
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              {/* Commented out buttons - keeping functions for future use */}
              {/* 
              <Button 
                onClick={loadStoredVideos} 
                variant="outline"
                size="sm"
                disabled={loadingStoredVideos}
              >
                {loadingStoredVideos ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              
              <Button 
                onClick={migrateLocalVideos} 
                variant="outline"
                size="sm"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                🔄 Migrate to Cloud
              </Button>
              
              <Button 
                onClick={testVideoStorage} 
                variant="outline"
                size="sm"
              >
                🧪 Test Storage
              </Button>
              
              <Button 
                onClick={addTestVideo} 
                variant="outline"
                size="sm"
              >
                🧪 Test Video
              </Button>
              */}
              
              <Button 
                onClick={clearStoredVideos} 
                variant="outline"
                size="sm"
              >
                🧹 Clear All
              </Button>
              
              <Button 
                onClick={handleGenerateVideo} 
                disabled={loading || !prompt.trim() || (selectedModel === 'seedance-v1-pro-i2v-720p' && !imageUrl.trim())}
                className="min-w-32"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Video'
                )}
              </Button>
            </div>
          </div>

          {/* Video model info - Updated to remove "100% Available" status */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">
              <strong>🎬 Video Generation:</strong> 
              <strong>Veo 2.0</strong>, <strong>Veo 3.0</strong>, and <strong>Seedance</strong> models are integrated and functional! 
              Real API calls are being made to generate actual videos.
            </p>
          </div>

          {/* Debug info */}
          {lastError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                <strong>Last Error:</strong> {lastError}
              </p>
            </div>
          )}
          
          {generatedVideos.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">
                <strong>Videos in gallery:</strong> {generatedVideos.length} 
                {storedVideos.length > 0 && ` (${storedVideos.length} stored in database)`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin mb-4 text-primary" />
              <h3 className="text-lg font-medium mb-2">Generating your video...</h3>
              <p className="text-sm text-muted-foreground">
                This may take 15-30 seconds. Video generation requires significant processing power.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Videos Grid */}
      {generatedVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {generatedVideos.map((video) => (
                <div key={video.id} className="group relative">
                  <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
                    <video
                      src={video.url}
                      className="h-full w-full object-cover"
                      controls
                      preload="metadata"
                      poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0ibTkgMTIgNS0zdjZsLTUtM3oiIGZpbGw9IiM5Y2E0YWYiLz4KPHBhdGggZD0iTTE3IDMuNWEyLjUgMi41IDAgMCAxIDIuNSAyLjV2MTJhMi41IDIuNSAwIDAgMS0yLjUgMi41SDE0VjMuNWgzeiIgZmlsbD0iI2ZjZjNmZiIgc3Ryb2tlPSIjZThlNWU5IiBzdHJva2Utd2lkdGg9IjEuNSIvPgo8L3N2Zz4K"
                      onLoadStart={() => console.log('🎬 Video loading started:', video.url)}
                      onCanPlay={() => console.log('✅ Video can play:', video.url)}
                      onError={(e) => {
                        const error = e.currentTarget.error;
                        console.error('❌ Video error details:', {
                          error: error,
                          errorCode: error?.code,
                          errorMessage: error?.message,
                          networkState: e.currentTarget.networkState,
                          readyState: e.currentTarget.readyState,
                          url: video.url,
                          currentSrc: e.currentTarget.currentSrc
                        });
                        console.error('Video URL:', video.url);
                      }}
                    >
                      <source src={video.url} type="video/mp4" />
                      Your browser does not support the video tag.
                      <p>Video URL: {video.url}</p>
                    </video>
                  </div>
                  
                  {/* Video Info */}
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {video.prompt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {AI_MODELS.find(m => m.id === video.model)?.name || video.model}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Video URL for debugging */}
                    <div className="text-xs text-muted-foreground bg-gray-100 p-2 rounded">
                      <strong>URL:</strong> <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{video.url}</a>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="flex-1">
                            <Play className="mr-2 h-4 w-4" />
                            Full Screen
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogTitle>Generated Video Playback</DialogTitle>
                          <div className="space-y-4">
                            <video
                              src={video.url}
                              className="w-full rounded-lg"
                              controls
                              autoPlay
                              onError={(e) => {
                                const error = e.currentTarget.error;
                                console.error('❌ Fullscreen video error details:', {
                                  error: error,
                                  errorCode: error?.code,
                                  errorMessage: error?.message,
                                  networkState: e.currentTarget.networkState,
                                  readyState: e.currentTarget.readyState,
                                  url: video.url,
                                  currentSrc: e.currentTarget.currentSrc
                                });
                              }}
                            >
                              <source src={video.url} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                            <div>
                              <h3 className="font-medium">Prompt</h3>
                              <p className="text-sm text-muted-foreground">{video.prompt}</p>
                              <p className="text-xs text-gray-500 mt-1">URL: {video.url}</p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant="outline">{AI_MODELS.find(m => m.id === video.model)?.name || video.model}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  Generated on {new Date(video.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(video.url!, video.prompt)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteVideo(video.id)}
                        title="Delete video"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {generatedVideos.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Video className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No videos generated yet</p>
              <p className="text-sm">Create your first AI-generated video above.</p>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  <strong>Note:</strong> Video generation is resource-intensive and may take 15-30 seconds. 
                  We use mock videos for this MVP demo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 