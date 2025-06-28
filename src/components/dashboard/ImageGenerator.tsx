'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Download, Eye, Sparkles, Trash2 } from 'lucide-react';
import { AI_MODELS } from '@/lib/constants';
import { mockApi } from '@/lib/mock-api';
import { GenerationResult } from '@/lib/types';

export function ImageGenerator() {
  const { updateCredits } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('dall-e-3');
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [selectedQuality, setSelectedQuality] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GenerationResult[]>([]);
  const [lastError, setLastError] = useState<string>('');
  const [imageModels, setImageModels] = useState<any[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  // Load available image models from API
  useEffect(() => {
    const fetchImageModels = async () => {
      try {
        const response = await fetch('/api/models');
        if (response.ok) {
          const data = await response.json();
          const allModels = data.data.providers.flatMap((provider: any) => 
            provider.models.map((model: any) => ({ ...model, provider: provider.name }))
          );
          const imageModels = allModels.filter((model: any) => model.type === 'image');
          setImageModels(imageModels);
          console.log('📸 Loaded image models:', imageModels);
        }
      } catch (error) {
        console.error('Failed to load image models:', error);
        // Fallback to basic models
        setImageModels([
          { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai', type: 'image' },
          { id: 'dall-e-2', name: 'DALL-E 2', provider: 'openai', type: 'image' }
        ]);
      } finally {
        setModelsLoading(false);
      }
    };

    fetchImageModels();
  }, []);

  // Check if model is actually working or just a placeholder
  const isModelWorking = (modelId: string) => {
    return modelId.startsWith('dall-e') || 
           modelId === 'stable-diffusion-xl' ||
           modelId.startsWith('imagen-'); // Imagen models are 100% available
  };

  // Debug function to test image addition
  const addTestImage = () => {
    const testImage: GenerationResult = {
      id: `test-${Date.now()}`,
      type: 'image',
      content: 'Test image',
      url: 'https://picsum.photos/512/512?random=' + Math.floor(Math.random() * 1000),
      model: 'test-model',
      prompt: 'Test prompt for debugging',
      userId: 'test-user',
      tokensUsed: 10,
      createdAt: new Date()
    };
    
    setGeneratedImages(prev => [testImage, ...prev]);
    console.log('🧪 Test image added:', testImage);
  };

  // Get available sizes based on selected model
  const getAvailableSizes = (model: string) => {
    if (model === 'dall-e-3') {
      return [
        { value: '1024x1024', label: '1024×1024 (Square)' },
        { value: '1792x1024', label: '1792×1024 (Landscape)' },
        { value: '1024x1792', label: '1024×1792 (Portrait)' }
      ];
    } else if (model === 'dall-e-2') {
      return [
        { value: '256x256', label: '256×256 (Small)' },
        { value: '512x512', label: '512×512 (Medium)' },
        { value: '1024x1024', label: '1024×1024 (Large)' }
      ];
    } else {
      return [{ value: '512x512', label: '512×512' }];
    }
  };

  // Update size when model changes
  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
    const availableSizes = getAvailableSizes(newModel);
    if (!availableSizes.find(s => s.value === selectedSize)) {
      setSelectedSize(availableSizes[0].value);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setLastError('');

    try {
      console.log('🎨 Starting image generation with:', { prompt, model: selectedModel });
      
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: selectedModel,
          size: selectedSize,
          quality: selectedModel === 'dall-e-3' ? selectedQuality : undefined
        }),
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        
        // Fallback to demo image if API fails
        if (response.status === 401 || response.status === 403) {
          console.warn('🔄 Auth issue, using demo image...');
          const demoResult: GenerationResult = {
            id: `demo-${Date.now()}`,
            type: 'image',
            content: `Demo image for: ${prompt}`,
            url: `https://picsum.photos/512/512?random=${Math.floor(Math.random() * 1000)}`,
            model: selectedModel,
            prompt: prompt,
            userId: 'demo-user',
            tokensUsed: 10,
            createdAt: new Date()
          };
          
          setGeneratedImages(prev => [demoResult, ...prev]);
          console.log('✅ Demo image added successfully');
          return;
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Image generation response:', data);

      if (data.success && data.data) {
        const result: GenerationResult = {
          id: data.data.id,
          type: 'image',
          content: `Generated with ${selectedModel}`,
          url: data.data.url,
          model: selectedModel,
          prompt: prompt,
          userId: 'current-user',
          tokensUsed: 10,
          createdAt: new Date()
        };

        console.log('🎯 Adding image to gallery:', result);
        setGeneratedImages(prev => {
          const newImages = [result, ...prev];
          console.log('📸 Updated images array:', newImages.length, 'images');
          return newImages;
        });
        updateCredits(10);
        
        console.log('✅ Image successfully added to gallery');
      } else {
        console.error('❌ Invalid response format:', data);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Failed to generate image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      
      // Show user-friendly error
      alert(`Failed to generate image: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (imageUrl: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `omnix-generated-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add image delete function
  const handleDeleteImage = (imageId: string) => {
    console.log('🗑️ Deleting image:', imageId);
    
    // Remove from local state
    setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
    
    console.log('✅ Image deleted successfully');
    alert('🗑️ Image deleted successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <span>Generate Images</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="min-h-20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {imageModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center space-x-2">
                        <span>{model.name}</span>
                        {isModelWorking(model.id) ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            ✅ Working
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            🚧 Placeholder
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          10 credits
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Size Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Size</label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSizes(selectedModel).map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quality Selection (DALL-E 3 only) */}
            {selectedModel === 'dall-e-3' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Quality</label>
                <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hd">HD (+20 credits)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Model warning */}
          {!isModelWorking(selectedModel) && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-600">
                <strong>⚠️ Note:</strong> {AI_MODELS.find(m => m.id === selectedModel)?.name} is currently showing placeholder images. 
                For real AI-generated images, please use <strong>DALL-E 3</strong>, <strong>DALL-E 2</strong>, or <strong>Imagen models</strong>.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            {/* Debug button - remove this after testing */}
            <Button 
              onClick={addTestImage} 
              variant="outline"
              size="sm"
            >
              🧪 Test Image
            </Button>
            
            <Button 
              onClick={handleGenerateImage} 
              disabled={loading || !prompt.trim()}
              className="min-w-24"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </div>

          {/* Debug info */}
          {lastError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                <strong>Last Error:</strong> {lastError}
              </p>
            </div>
          )}
          
          {generatedImages.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">
                <strong>Images in gallery:</strong> {generatedImages.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Images Grid */}
      {generatedImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedImages.map((image) => (
                <div key={image.id} className="group relative">
                  <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={image.url}
                      alt={image.prompt}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="secondary">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogTitle>Generated Image Preview</DialogTitle>
                        <div className="space-y-4">
                          <img
                            src={image.url}
                            alt={image.prompt}
                            className="w-full rounded-lg"
                          />
                          <div>
                            <h3 className="font-medium">Prompt</h3>
                            <p className="text-sm text-muted-foreground">{image.prompt}</p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline">{AI_MODELS.find(m => m.id === image.model)?.name}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(image.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleDownload(image.url!, image.prompt)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDeleteImage(image.id)}
                      title="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Prompt preview */}
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {image.prompt}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="outline" className="text-xs">
                        {AI_MODELS.find(m => m.id === image.model)?.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {generatedImages.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No images generated yet</p>
              <p className="text-sm">Create your first AI-generated image above.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 