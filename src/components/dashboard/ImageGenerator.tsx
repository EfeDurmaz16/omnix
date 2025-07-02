'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Download, Eye, Sparkles, Trash2, Edit3, Save } from 'lucide-react';
import { AI_MODELS } from '@/lib/constants';
import { mockApi } from '@/lib/mock-api';
import { GenerationResult } from '@/lib/types';
import ImageEditor from '@/components/images/ImageEditor';
import { StoredImage } from '@/lib/storage/CloudStorageService';
import ImageVersionViewer from '@/components/images/ImageVersionViewer';

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
  const [editingImage, setEditingImage] = useState<GenerationResult | null>(null);
  const [savingToGallery, setSavingToGallery] = useState<string | null>(null);
  const [autoSaveToGallery, setAutoSaveToGallery] = useState(true);

  // Load available image models and saved images from API
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

    const loadSavedImages = async () => {
      try {
        console.log('🔄 Loading saved images from storage...');
        const response = await fetch('/api/images');
        if (response.ok) {
          const data = await response.json();
          if (data.images && data.images.length > 0) {
            // Convert StoredImage[] to GenerationResult[] for display
            const savedImages: GenerationResult[] = data.images.map((img: any) => ({
              id: img.id,
              type: 'image' as const,
              content: img.editPrompt ? `Edited: ${img.editPrompt}` : `Generated with ${img.model}`,
              url: img.url,
              model: img.model,
              prompt: img.editPrompt || img.prompt,
              userId: img.userId,
              tokensUsed: 10,
              createdAt: new Date(img.createdAt),
              // Include parent relationship for proper versioning
              parentId: img.parentId
            } as GenerationResult & { parentId?: string }));
            
            setGeneratedImages(savedImages);
            console.log('✅ Loaded saved images:', savedImages.length);
          }
        }
      } catch (error) {
        console.error('Failed to load saved images:', error);
      }
    };

    fetchImageModels();
    loadSavedImages();
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
          quality: selectedModel === 'dall-e-3' ? selectedQuality : undefined,
          saveToGallery: autoSaveToGallery
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
          // Avoid duplicates if image already exists
          const exists = prev.find(img => img.id === result.id);
          if (exists) {
            console.log('📸 Image already exists in gallery, not adding duplicate');
            return prev;
          }
          const newImages = [result, ...prev];
          console.log('📸 Updated images array:', newImages.length, 'images');
          return newImages;
        });
        updateCredits(10);
        
        // Show success message based on auto-save setting
        if (data.data.savedToGallery) {
          console.log('✅ Image generated and saved to gallery - ready for editing!');
        } else {
          console.log('✅ Image generated successfully - use Save button to add to gallery');
        }
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

  const handleSaveToGallery = async (image: GenerationResult) => {
    setSavingToGallery(image.id);
    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store-generated',
          prompt: image.prompt,
          model: image.model,
          imageUrl: image.url,
          metadata: {
            size: '1024x1024',
            generatedAt: image.createdAt
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('✅ Image saved to gallery! You can now edit it from the gallery.');
      } else {
        throw new Error('Failed to save image');
      }
    } catch (error) {
      console.error('Failed to save image to gallery:', error);
      alert('❌ Failed to save image to gallery. Please try again.');
    } finally {
      setSavingToGallery(null);
    }
  };

  // Convert GenerationResult to StoredImage for editing
  const convertToStoredImage = (image: GenerationResult): StoredImage => {
    return {
      id: image.id,
      userId: image.userId || 'current-user',
      prompt: image.prompt || '',
      model: image.model || 'dall-e-3',
      url: image.url || '',
      thumbnailUrl: image.url,
      width: 1024,
      height: 1024,
      size: undefined,
      metadata: {},
      isPublic: false,
      tags: [],
      parentId: undefined,
      editPrompt: undefined,
      editOperation: undefined,
      version: 1,
      createdAt: image.createdAt || new Date(),
      updatedAt: image.createdAt || new Date()
    };
  };

  const handleEditImage = (image: GenerationResult) => {
    const storedImage = convertToStoredImage(image);
    setEditingImage(image);
  };

  // Group images by their base/parent relationship for versioning
  const groupImagesByBase = () => {
    const imageGroups = new Map<string, { base: GenerationResult; versions: GenerationResult[] }>();
    
    // First pass: identify base images and create groups
    generatedImages.forEach(image => {
      const imageWithParent = image as GenerationResult & { parentId?: string };
      const isEditedVersion = imageWithParent.parentId || (image.content && image.content.includes('Edited with'));
      
      if (!isEditedVersion && image && image.id && image.url) {
        // This is a base image with valid data
        if (!imageGroups.has(image.id)) {
          imageGroups.set(image.id, {
            base: image,
            versions: []
          });
        }
      }
    });
    
    // Second pass: add edited versions to their respective groups
    generatedImages.forEach(image => {
      const imageWithParent = image as GenerationResult & { parentId?: string };
      const parentId = imageWithParent.parentId;
      
      if (parentId && imageGroups.has(parentId)) {
        imageGroups.get(parentId)!.versions.push(image);
      } else if (image.content && image.content.includes('Edited with') && !parentId) {
        // Fallback for older edited images without proper parentId
        const potentialBaseId = getOriginalImageId(image);
        if (imageGroups.has(potentialBaseId)) {
          imageGroups.get(potentialBaseId)!.versions.push(image);
        } else {
          // Create a new group for orphaned edited images
          if (!imageGroups.has(image.id)) {
            imageGroups.set(image.id, {
              base: image,
              versions: []
            });
          }
        }
      }
    });
    
    // Sort versions within each group by creation time
    imageGroups.forEach(group => {
      group.versions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
    
    return Array.from(imageGroups.values())
      .sort((a, b) => {
        // Sort by most recent activity (either base creation or latest version)
        const aLatest = a.versions.length > 0 ? 
          Math.max(new Date(a.base.createdAt).getTime(), new Date(a.versions[a.versions.length - 1].createdAt).getTime()) :
          new Date(a.base.createdAt).getTime();
        const bLatest = b.versions.length > 0 ?
          Math.max(new Date(b.base.createdAt).getTime(), new Date(b.versions[b.versions.length - 1].createdAt).getTime()) :
          new Date(b.base.createdAt).getTime();
        return bLatest - aLatest;
      });
  };

  // Helper function to extract original image ID from edited images
  const getOriginalImageId = (image: GenerationResult): string => {
    // This would need to be enhanced based on how you store parent relationships
    // For now, using a simple heuristic
    return image.id.split('-edit-')[0] || image.id;
  };

  // Convert GenerationResult to ImageVersion format
  const convertToImageVersion = (image: GenerationResult, versionNumber: number) => ({
    id: image.id,
    url: image.url,
    prompt: image.prompt,
    editPrompt: image.content && image.content.includes('Edited with') ? 
      image.prompt : undefined,
    model: image.model,
    createdAt: image.createdAt,
    version: versionNumber
  });

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card className="cultural-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <span>Generate Images</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium cultural-text-primary">Prompt</label>
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
                    <label className="text-sm font-medium cultural-text-primary">Model</label>
                    <Select value={selectedModel} onValueChange={handleModelChange}>
                      <SelectTrigger className="cultural-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="cultural-card">
                        {imageModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center space-x-2">
                              <span>{model.name}</span>
                              {isModelWorking(model.id) ? (
                                <Badge variant="default">
                                  ✅ Working
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  🚧 Placeholder
                                </Badge>
                              )}
                              <Badge variant="outline">
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
              <label className="text-sm font-medium cultural-text-primary">Size</label>
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
                <label className="text-sm font-medium cultural-text-primary">Quality</label>
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

          {/* Auto-save option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoSaveToGallery"
              checked={autoSaveToGallery}
              onChange={(e) => setAutoSaveToGallery(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoSaveToGallery" className="text-sm text-muted-foreground">
              Automatically save to gallery (enables editing)
            </label>
          </div>

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

      {/* Generated Images Grid with Versioning */}
      {generatedImages.length > 0 && (
        <Card className="cultural-card">
          <CardHeader>
            <CardTitle className="cultural-text-primary">Generated Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupImagesByBase()
                .filter(group => group.base && group.base.id && group.base.url) // Filter out invalid groups
                .map((imageGroup) => {
                const versions = imageGroup.versions
                  .filter(version => version && version.id && version.url) // Filter out invalid versions
                  .map((version, index) => 
                    convertToImageVersion(version, index + 2)
                  );
                
                return (
                  <ImageVersionViewer
                    key={imageGroup.base.id}
                    baseImage={imageGroup.base}
                    versions={versions}
                    onEdit={(version) => {
                      // Find the GenerationResult that matches this version
                      const imageToEdit = version.version === 1 ? 
                        imageGroup.base : 
                        imageGroup.versions[version.version - 2];
                      handleEditImage(imageToEdit);
                    }}
                    onDownload={(version) => {
                      handleDownload(version.url, version.prompt);
                    }}
                    onDelete={(versionId) => {
                      handleDeleteImage(versionId);
                    }}
                    onSaveToGallery={(version) => {
                      // Find the GenerationResult that matches this version
                      const imageToSave = version.version === 1 ? 
                        imageGroup.base : 
                        imageGroup.versions[version.version - 2];
                      handleSaveToGallery(imageToSave);
                    }}
                    isSaving={savingToGallery === imageGroup.base.id}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {generatedImages.length === 0 && !loading && (
        <Card className="cultural-card">
          <CardContent className="py-12">
            <div className="text-center cultural-text-muted">
              <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No images generated yet</p>
              <p className="text-sm">Create your first AI-generated image above.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Editor Modal */}
      {editingImage && (
        <ImageEditor
          image={convertToStoredImage(editingImage)}
          onClose={() => setEditingImage(null)}
          onSave={(editedImage) => {
            // Convert the StoredImage back to GenerationResult for display
            const newGenerationResult: GenerationResult = {
              id: editedImage.id,
              type: 'image',
              content: `Edited with ${editedImage.model}`,
              url: editedImage.url,
              model: editedImage.model,
              prompt: editedImage.editPrompt || editedImage.prompt,
              userId: editedImage.userId,
              tokensUsed: 10, // Default token usage for edits
              createdAt: editedImage.createdAt,
              // Add parent relationship for versioning
              parentId: editedImage.parentId
            } as GenerationResult & { parentId?: string };
            
            // Add the edited image to the gallery (avoid duplicates)
            setGeneratedImages(prev => {
              const exists = prev.find(img => img.id === newGenerationResult.id);
              if (exists) {
                return prev; // Don't add if already exists
              }
              return [newGenerationResult, ...prev];
            });
            setEditingImage(null);
            
            console.log('✅ Edited image added to gallery:', newGenerationResult);
            alert('✅ Image edited successfully! The new version has been added to your gallery.');
          }}
        />
      )}
    </div>
  );
} 