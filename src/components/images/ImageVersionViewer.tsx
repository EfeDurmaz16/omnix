'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Download, 
  Eye, 
  Trash2,
  MoreHorizontal,
  History,
  Save
} from 'lucide-react';
import { GenerationResult } from '@/lib/types';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';

interface ImageVersion {
  id: string;
  url: string;
  prompt: string;
  editPrompt?: string;
  model: string;
  createdAt: Date;
  version: number;
}

interface ImageVersionViewerProps {
  baseImage: GenerationResult;
  versions: ImageVersion[];
  onEdit: (version: ImageVersion) => void;
  onDownload: (version: ImageVersion) => void;
  onDelete: (versionId: string) => void;
  onSaveToGallery?: (version: ImageVersion) => void;
  isSaving?: boolean;
  className?: string;
}

export default function ImageVersionViewer({
  baseImage,
  versions,
  onEdit,
  onDownload,
  onDelete,
  onSaveToGallery,
  isSaving = false,
  className = ""
}: ImageVersionViewerProps) {
  // Validate baseImage first
  if (!baseImage || !baseImage.url) {
    console.error('Invalid baseImage provided:', baseImage);
    return (
      <div className={`${className} p-4 border border-red-200 bg-red-50 rounded-lg`}>
        <p className="text-red-600 text-sm">Error: Invalid image data</p>
      </div>
    );
  }

  // Combine base image with versions
  const allVersions: ImageVersion[] = [
    {
      id: baseImage.id,
      url: baseImage.url,
      prompt: baseImage.prompt,
      model: baseImage.model,
      createdAt: baseImage.createdAt,
      version: 1
    },
    ...versions.sort((a, b) => a.version - b.version)
  ];

  // Move useState after validation to fix React Hooks rule
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0); // Start with version 1 (original)

  const currentVersion = allVersions[currentVersionIndex];
  const hasMultipleVersions = allVersions.length > 1;

  // Safety check to prevent crashes
  if (!currentVersion) {
    console.error('No current version found:', { currentVersionIndex, allVersionsLength: allVersions.length, allVersions });
    return (
      <div className={`${className} p-4 border border-red-200 bg-red-50 rounded-lg`}>
        <p className="text-red-600 text-sm">Error: Unable to display image version</p>
      </div>
    );
  }

  const goToPreviousVersion = () => {
    if (currentVersionIndex > 0) {
      setCurrentVersionIndex(currentVersionIndex - 1);
    }
  };

  const goToNextVersion = () => {
    if (currentVersionIndex < allVersions.length - 1) {
      setCurrentVersionIndex(currentVersionIndex + 1);
    }
  };

  const getVersionDescription = (version: ImageVersion, index: number) => {
    if (index === 0) {
      return `Original: ${version.prompt}`;
    }
    return `Edit ${index}: ${version.editPrompt || 'Modified version'}`;
  };

  return (
    <div className={`group relative ${className}`}>
      <Card className="cultural-card overflow-hidden">
        {/* Image Display */}
        <div className="aspect-square relative overflow-hidden">
          <img
            src={currentVersion.url}
            alt={currentVersion.prompt}
            className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:opacity-75"
          />
          
          {/* Version Navigation Overlay */}
          {hasMultipleVersions && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-between px-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={goToPreviousVersion}
                disabled={currentVersionIndex === 0}
                className="h-10 w-10 p-0 bg-white/90 hover:bg-white border-2 border-gray-300 shadow-lg backdrop-blur-sm"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </Button>
              
              <Button
                size="sm"
                variant="secondary"
                onClick={goToNextVersion}
                disabled={currentVersionIndex === allVersions.length - 1}
                className="h-10 w-10 p-0 bg-white/90 hover:bg-white border-2 border-gray-300 shadow-lg backdrop-blur-sm"
              >
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </Button>
            </div>
          )}

          {/* Version Counter */}
          {hasMultipleVersions && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs bg-black/50 text-white">
                <History className="h-3 w-3 mr-1" />
                {currentVersionIndex + 1}/{allVersions.length}
              </Badge>
            </div>
          )}

          {/* Action Buttons Overlay */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex space-x-1 bg-black/20 backdrop-blur-sm rounded-lg p-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0 bg-white/90 hover:bg-white border border-gray-300 shadow-md">
                    <Eye className="h-4 w-4 text-gray-700" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogTitle>Image Version {currentVersionIndex + 1}</DialogTitle>
                  <div className="space-y-4">
                    <img
                      src={currentVersion.url}
                      alt={currentVersion.prompt}
                      className="w-full rounded-lg"
                    />
                    <div>
                      <h3 className="font-medium">
                        {currentVersionIndex === 0 ? 'Original Prompt' : `Edit Prompt (Version ${currentVersionIndex + 1})`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {currentVersionIndex === 0 ? currentVersion.prompt : currentVersion.editPrompt}
                      </p>
                      {currentVersionIndex > 0 && (
                        <div className="mt-2">
                          <h4 className="font-medium text-sm">Based on:</h4>
                          <p className="text-xs text-muted-foreground">{allVersions[0].prompt}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline">{currentVersion.model}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(currentVersion.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => onEdit(currentVersion)}
                className="h-8 w-8 p-0 bg-white/90 hover:bg-white border border-gray-300 shadow-md"
              >
                <Edit3 className="h-4 w-4 text-gray-700" />
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => onDownload(currentVersion)}
                className="h-8 w-8 p-0 bg-white/90 hover:bg-white border border-gray-300 shadow-md"
              >
                <Download className="h-4 w-4 text-gray-700" />
              </Button>

              {onSaveToGallery && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onSaveToGallery(currentVersion)}
                  disabled={isSaving}
                  className="h-8 w-8 p-0 bg-white/90 hover:bg-white border border-gray-300 shadow-md"
                  title="Save to Gallery"
                >
                  {isSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-700"></div>
                  ) : (
                    <Save className="h-4 w-4 text-gray-700" />
                  )}
                </Button>
              )}

              <Button
                size="sm"
                variant="secondary"
                onClick={() => onDelete(currentVersion.id)}
                className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-500 border border-red-400 shadow-md"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <CardContent className="p-3">
          <div className="space-y-2">
            <p className="text-sm cultural-text-primary line-clamp-2">
              {getVersionDescription(currentVersion, currentVersionIndex)}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {currentVersion.model}
                </Badge>
                {hasMultipleVersions && (
                  <Badge variant="secondary" className="text-xs">
                    {allVersions.length} versions
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(currentVersion.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Version Timeline (for multiple versions) */}
            {hasMultipleVersions && (
              <div className="flex items-center space-x-1 mt-2">
                {allVersions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentVersionIndex(index)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      index === currentVersionIndex 
                        ? 'bg-primary' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    title={`Version ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}