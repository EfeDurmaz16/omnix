'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Edit3,
  Wand2,
  Scissors,
  Expand,
  RotateCcw,
  Save,
  X,
  Clock,
  Sparkles,
  ArrowLeft,
  Download
} from 'lucide-react';
import { StoredImage } from '@/lib/storage/CloudStorageService';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';

interface ImageEditorProps {
  image: StoredImage;
  onClose: () => void;
  onSave?: (editedImage: StoredImage) => void;
  className?: string;
}

interface EditRequest {
  imageId: string;
  editPrompt: string;
  editType: 'variation' | 'inpaint' | 'outpaint';
  editModel?: string;
}

export default function ImageEditor({ 
  image, 
  onClose, 
  onSave,
  className = "" 
}: ImageEditorProps) {
  const { user } = useAuth();
  const [editPrompt, setEditPrompt] = useState('');
  const [editType, setEditType] = useState<'variation' | 'inpaint' | 'outpaint'>('variation');
  const [editModel, setEditModel] = useState('dall-e-3');
  const [isEditing, setIsEditing] = useState(false);
  const [versions, setVersions] = useState<StoredImage[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<StoredImage>(image);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  useEffect(() => {
    loadImageVersions();
    loadAvailableModels();
  }, [image.id]);

  const loadAvailableModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Models API response:', data);
        
        // Extract all models from all providers
        const allModels: any[] = [];
        if (data.success && data.data?.providers) {
          data.data.providers.forEach((provider: any) => {
            if (provider.models) {
              provider.models.forEach((model: any) => {
                allModels.push({
                  ...model,
                  provider: provider.name
                });
              });
            }
          });
        }
        
        console.log('📋 All models extracted:', allModels);
        
        // Filter for image generation models
        const imageModels = allModels.filter((model: any) => 
          model.type === 'image' || 
          model.capabilities?.some((cap: any) => cap.type === 'image-generation') ||
          model.id.includes('dall-e') ||
          model.id.includes('midjourney') ||
          model.id.includes('stable') ||
          model.id.includes('imagen') ||
          model.id.includes('gpt-image')
        );
        
        console.log('🎨 Image models found:', imageModels);
        
        // If no image models found, add fallback models
        if (imageModels.length === 0) {
          console.warn('No image models found from API, using fallback');
          setAvailableModels([
            { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai' },
            { id: 'dall-e-2', name: 'DALL-E 2', provider: 'openai' },
            { id: 'gpt-image-1', name: 'GPT-Image-1', provider: 'openai' },
            { id: 'gpt-4-vision', name: 'GPT-4 Vision', provider: 'openai' },
            { id: 'midjourney-v6', name: 'Midjourney v6', provider: 'midjourney' },
            { id: 'midjourney-v5.2', name: 'Midjourney v5.2', provider: 'midjourney' },
            { id: 'midjourney-niji', name: 'Midjourney Niji', provider: 'midjourney' },
            { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', provider: 'stability' },
            { id: 'stable-diffusion-3', name: 'Stable Diffusion 3', provider: 'stability' }
          ]);
        } else {
          setAvailableModels(imageModels);
        }
      }
    } catch (error) {
      console.error('Failed to load available models:', error);
      // Fallback models
      setAvailableModels([
        { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai' },
        { id: 'dall-e-2', name: 'DALL-E 2', provider: 'openai' },
        { id: 'gpt-image-1', name: 'GPT-Image-1', provider: 'openai' },
        { id: 'gpt-4-vision', name: 'GPT-4 Vision', provider: 'openai' },
        { id: 'midjourney-v6', name: 'Midjourney v6', provider: 'midjourney' },
        { id: 'midjourney-v5.2', name: 'Midjourney v5.2', provider: 'midjourney' },
        { id: 'midjourney-niji', name: 'Midjourney Niji', provider: 'midjourney' },
        { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', provider: 'stability' },
        { id: 'stable-diffusion-3', name: 'Stable Diffusion 3', provider: 'stability' }
      ]);
    }
  };

  const loadImageVersions = async () => {
    if (!user?.id) return;
    
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/images/${image.id}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Failed to load image versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim() || !user?.id) return;

    setIsEditing(true);
    try {
      const response = await fetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: selectedVersion.id,
          editPrompt: editPrompt.trim(),
          editType,
          editModel,
          originalImage: {
            id: selectedVersion.id,
            prompt: selectedVersion.prompt,
            model: selectedVersion.model,
            url: selectedVersion.url,
            width: selectedVersion.width,
            height: selectedVersion.height
          },
          sourceImageData: selectedVersion.url // Pass the image data for image-to-image editing
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Add the new edited version to the list
          const newVersion: StoredImage = {
            id: result.editedImage.id,
            userId: user.id,
            prompt: selectedVersion.prompt,
            model: selectedVersion.model,
            url: result.editedImage.url,
            thumbnailUrl: result.editedImage.thumbnailUrl,
            width: selectedVersion.width,
            height: selectedVersion.height,
            size: selectedVersion.size,
            metadata: selectedVersion.metadata,
            isPublic: false,
            tags: selectedVersion.tags,
            parentId: result.editedImage.parentId,
            editPrompt: result.editedImage.editPrompt,
            editOperation: {
              type: editType,
              prompt: editPrompt,
              timestamp: new Date().toISOString()
            },
            version: result.editedImage.version,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          setVersions(prev => [...prev, newVersion]);
          setSelectedVersion(newVersion);
          setEditPrompt('');
          onSave?.(newVersion);
        } else {
          throw new Error(result.error || 'Failed to edit image');
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to edit image');
      }
    } catch (error: any) {
      console.error('Failed to edit image:', error);
      alert('Failed to edit image: ' + error.message);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = async (imageToDownload: StoredImage) => {
    try {
      const response = await fetch(imageToDownload.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${imageToDownload.prompt.slice(0, 30)}_v${imageToDownload.version}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const editTypeOptions = [
    { 
      value: 'variation', 
      label: 'Create Variation', 
      icon: Wand2,
      description: 'Generate a new version with modifications'
    },
    { 
      value: 'inpaint', 
      label: 'Inpaint/Modify', 
      icon: Edit3,
      description: 'Modify specific parts of the image'
    },
    { 
      value: 'outpaint', 
      label: 'Extend/Outpaint', 
      icon: Expand,
      description: 'Extend the image beyond its borders'
    }
  ];

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 ${className}`}>
      <div className="bg-background rounded-lg max-w-6xl max-h-[95vh] overflow-auto w-full">
        {/* Header */}
        <div className="p-4 border-b cultural-border sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold cultural-text-primary">Image Editor</h3>
              {selectedVersion.version > 1 && (
                <Badge variant="secondary">
                  Version {selectedVersion.version}
                </Badge>
              )}
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left Panel - Image Display */}
          <div className="space-y-4">
            {/* Current Image */}
            <Card className="cultural-card">
              <CardHeader>
                <CardTitle className="text-sm">
                  {selectedVersion.version === 1 ? 'Original Image' : `Edited Version ${selectedVersion.version}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <img
                    src={selectedVersion.url}
                    alt={selectedVersion.prompt}
                    className="w-full max-h-96 object-contain rounded"
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(selectedVersion)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Original Prompt:</p>
                    <p className="text-sm cultural-text-primary">{selectedVersion.prompt}</p>
                  </div>
                  
                  {selectedVersion.editPrompt && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Edit Prompt:</p>
                      <p className="text-sm cultural-text-primary">{selectedVersion.editPrompt}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Model: {selectedVersion.model}</span>
                    <span>Size: {selectedVersion.width}×{selectedVersion.height}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Version History */}
            {versions.length > 1 && (
              <Card className="cultural-card">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Version History ({versions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className={`relative cursor-pointer rounded border-2 transition-colors ${
                          selectedVersion.id === version.id 
                            ? 'border-primary' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedVersion(version)}
                      >
                        <img
                          src={version.thumbnailUrl || version.url}
                          alt={`Version ${version.version}`}
                          className="w-full aspect-square object-cover rounded"
                        />
                        <div className="absolute top-1 left-1">
                          <Badge variant="secondary" className="text-xs">
                            v{version.version}
                          </Badge>
                        </div>
                        {version.editPrompt && (
                          <div className="absolute bottom-1 right-1">
                            <Badge variant="outline" className="text-xs">
                              <Edit3 className="h-2 w-2" />
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Editing Controls */}
          <div className="space-y-4">
            {/* Edit Type Selection */}
            <Card className="cultural-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Edit Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        editType === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setEditType(option.value as any)}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Model Selection */}
            <Card className="cultural-card">
              <CardHeader>
                <CardTitle className="text-sm">AI Model ({availableModels.length} available)</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  className="w-full p-2 border rounded-md cultural-card cultural-border cultural-text-primary bg-input focus:ring-2 focus:ring-ring"
                >
                  {availableModels.length === 0 ? (
                    <option disabled>Loading models...</option>
                  ) : (
                    availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Choose the AI model for editing. Different models have different strengths and styles.
                </p>
                {availableModels.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ No models loaded yet. Check console for errors.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Edit Prompt Input */}
            <Card className="cultural-card">
              <CardHeader>
                <CardTitle className="text-sm">Edit Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Describe the changes you want to make:
                  </label>
                  <Textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder={
                      editType === 'variation' 
                        ? "e.g., make it more colorful, change the style to watercolor, add flowers..."
                        : editType === 'inpaint'
                        ? "e.g., change the background to a sunset, remove the person, add a cat..."
                        : "e.g., extend the scene to show more of the landscape, add more sky..."
                    }
                    className="mt-2"
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleEdit}
                  disabled={!editPrompt.trim() || isEditing}
                  className="w-full cultural-primary"
                >
                  {isEditing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Apply Edit
                    </>
                  )}
                </Button>

                {isEditing && (
                  <div className="text-xs text-muted-foreground text-center">
                    This may take 10-30 seconds to process...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Model-Specific Tips */}
            <Card className="cultural-card">
              <CardHeader>
                <CardTitle className="text-sm">💡 Model Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {editModel.includes('dall-e') && (
                  <>
                    <p><strong>DALL-E:</strong> Great for realistic and creative imagery</p>
                    <p>• Use detailed, descriptive prompts</p>
                    <p>• Specify art styles: "in the style of Monet", "photorealistic"</p>
                  </>
                )}
                {editModel.includes('gpt-image-1') && (
                  <>
                    <p><strong>GPT-Image-1:</strong> Advanced editing with precise control</p>
                    <p>• Perfect for inpainting and outpainting</p>
                    <p>• Use technical terms: "remove background", "enhance lighting"</p>
                  </>
                )}
                {editModel.includes('gpt-4-vision') && (
                  <>
                    <p><strong>GPT-4 Vision:</strong> AI analyzes your image first</p>
                    <p>• Describe changes in context: "make the sky darker"</p>
                    <p>• Reference existing elements: "change the car to red"</p>
                  </>
                )}
                {editModel.includes('midjourney') && (
                  <>
                    <p><strong>Midjourney:</strong> Artistic and stylized results</p>
                    <p>• Use artistic terms: "dramatic lighting", "fantasy style"</p>
                    <p>• Try parameters: "--style anime", "--quality 2"</p>
                  </>
                )}
                {editModel.includes('stable-diffusion') && (
                  <>
                    <p><strong>Stable Diffusion:</strong> Fast and customizable</p>
                    <p>• Use keyword-rich prompts</p>
                    <p>• Specify quality: "ultra detailed", "8k resolution"</p>
                  </>
                )}
                <div className="border-t pt-2 mt-2">
                  <p><strong>General Tips:</strong></p>
                  <p>• Be specific about what you want to change</p>
                  <p>• For variations, describe style or mood changes</p>
                  <p>• For inpainting, specify what to modify or remove</p>
                  <p>• For outpainting, describe what should be in the extended areas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}