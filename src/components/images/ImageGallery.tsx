'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Image as ImageIcon,
  Edit3,
  Download,
  Trash2,
  Share2,
  Search,
  Filter,
  Grid3X3,
  List,
  Upload,
  Eye,
  Heart,
  MessageSquare,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { StoredImage } from '@/lib/storage/CloudStorageService';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import ImageEditor from './ImageEditor';

interface ImageGalleryProps {
  onImageEdit?: (image: StoredImage) => void;
  onImageSelect?: (image: StoredImage) => void;
  className?: string;
}

export default function ImageGallery({ 
  onImageEdit, 
  onImageSelect,
  className = "" 
}: ImageGalleryProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<StoredImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null);
  const [editingImage, setEditingImage] = useState<StoredImage | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadImages();
    }
  }, [user]);

  // Auto-refresh every 30 seconds when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id && document.visibilityState === 'visible' && !loading) {
        console.log('🔄 Auto-refreshing gallery...');
        loadImages();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?.id, loading]);

  const loadImages = async () => {
    try {
      setLoading(true);
      console.log('🖼️ Loading images for user:', user?.id);
      
      const response = await fetch('/api/images');
      if (response.ok) {
        const data = await response.json();
        console.log('📸 Loaded images:', data.images?.length || 0);
        setImages(data.images || []);
      } else {
        console.error('Failed to load images:', response.status);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user?.id) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', user.id);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setImages(prev => [result.image, ...prev]);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleImageDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== imageId));
        if (selectedImage?.id === imageId) {
          setSelectedImage(null);
        }
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  const handleImageDownload = async (image: StoredImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.prompt.slice(0, 30)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const handleImageShare = async (image: StoredImage) => {
    try {
      await navigator.share({
        title: `AI Generated Image: ${image.prompt.slice(0, 50)}...`,
        text: `Check out this AI-generated image created with ${image.model}`,
        url: image.url
      });
    } catch (error) {
      // Fallback to copying URL
      navigator.clipboard.writeText(image.url);
      alert('Image URL copied to clipboard!');
    }
  };

  const filteredImages = images.filter(image => {
    const matchesSearch = searchTerm === '' || 
      image.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' || 
      selectedFilter === 'public' && image.isPublic ||
      selectedFilter === 'private' && !image.isPublic ||
      image.model.toLowerCase().includes(selectedFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  const uniqueModels = [...new Set(images.map(img => img.model))];
  const filters = [
    { id: 'all', label: 'All Images' },
    { id: 'public', label: 'Public' },
    { id: 'private', label: 'Private' },
    ...uniqueModels.map(model => ({ id: model, label: model }))
  ];

  if (loading) {
    return (
      <Card className="cultural-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 cultural-text-primary">Loading images...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="cultural-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center cultural-text-primary">
              <ImageIcon className="mr-2 h-5 w-5" />
              Image Gallery ({images.length})
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {/* Upload Button */}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                className="hidden"
                id="image-upload"
                disabled={uploading}
              />
              <label htmlFor="image-upload">
                <Button 
                  as="span" 
                  size="sm" 
                  className="cultural-primary cursor-pointer"
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </label>

              {/* Refresh Button */}
              <Button 
                size="sm" 
                variant="outline"
                onClick={loadImages}
                disabled={loading}
                className="cultural-border"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              {/* View Mode Toggle */}
              <div className="flex border cultural-border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search images by prompt or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border cultural-border rounded-md bg-background text-foreground"
              >
                {filters.map(filter => (
                  <option key={filter.id} value={filter.id}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Grid/List */}
      {filteredImages.length === 0 ? (
        <Card className="cultural-card">
          <CardContent className="p-12 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold cultural-text-primary mb-2">No images found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Start by generating or uploading your first image.'}
            </p>
            {!searchTerm && (
              <label htmlFor="image-upload">
                <Button className="cultural-primary cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </label>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-4'
        }>
          {filteredImages.map((image) => (
            <Card key={image.id} className="cultural-card overflow-hidden group hover:shadow-lg transition-shadow">
              {viewMode === 'grid' ? (
                <>
                  {/* Grid View */}
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={image.thumbnailUrl || image.url}
                      alt={image.prompt}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedImage(image)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingImage(image)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleImageDownload(image)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm cultural-text-primary line-clamp-2 mb-2">
                      {image.prompt}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {image.model}
                      </Badge>
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleImageShare(image)}
                          className="h-6 w-6 p-0"
                        >
                          <Share2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleImageDelete(image.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <>
                  {/* List View */}
                  <CardContent className="p-4">
                    <div className="flex space-x-4">
                      <img
                        src={image.thumbnailUrl || image.url}
                        alt={image.prompt}
                        className="w-20 h-20 object-cover rounded cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium cultural-text-primary truncate">
                          {image.prompt}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {image.model}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(image.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {image.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingImage(image)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleImageDownload(image)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleImageShare(image)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleImageDelete(image.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b cultural-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold cultural-text-primary">Image Details</h3>
                <Button variant="ghost" onClick={() => setSelectedImage(null)}>
                  ×
                </Button>
              </div>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.prompt}
                className="w-full max-h-96 object-contain rounded mb-4"
              />
              <div className="space-y-3">
                <div>
                  <label className="font-medium cultural-text-primary">Prompt:</label>
                  <p className="text-muted-foreground">{selectedImage.prompt}</p>
                </div>
                <div className="flex space-x-4">
                  <div>
                    <label className="font-medium cultural-text-primary">Model:</label>
                    <p className="text-muted-foreground">{selectedImage.model}</p>
                  </div>
                  <div>
                    <label className="font-medium cultural-text-primary">Created:</label>
                    <p className="text-muted-foreground">
                      {new Date(selectedImage.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedImage.width && selectedImage.height && (
                    <div>
                      <label className="font-medium cultural-text-primary">Dimensions:</label>
                      <p className="text-muted-foreground">
                        {selectedImage.width} × {selectedImage.height}
                      </p>
                    </div>
                  )}
                </div>
                {selectedImage.tags.length > 0 && (
                  <div>
                    <label className="font-medium cultural-text-primary">Tags:</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedImage.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex space-x-2 pt-4">
                  <Button onClick={() => setEditingImage(selectedImage)} className="cultural-primary">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Image
                  </Button>
                  <Button variant="outline" onClick={() => handleImageDownload(selectedImage)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => handleImageShare(selectedImage)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      {editingImage && (
        <ImageEditor
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={(editedImage) => {
            // Refresh the gallery to show the new edited image
            console.log('🔄 Image editing completed, refreshing gallery...');
            loadImages();
            setEditingImage(null);
          }}
        />
      )}
    </div>
  );
}