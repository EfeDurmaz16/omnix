"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  Edit, 
  Eye,
  EyeOff,
  Filter,
  Search,
  Grid3X3,
  List,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Tag,
  Copy,
  Share
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { videoStorageManager, VideoMetadata, VideoUploadOptions } from '@/lib/video-storage-manager';

interface VideoManagementDashboardProps {
  userId: string;
}

export function VideoManagementDashboard({ userId }: VideoManagementDashboardProps) {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalSize: 0,
    readyVideos: 0,
    processingVideos: 0,
    failedVideos: 0
  });

  // Load videos and stats
  const loadData = useCallback(() => {
    const userVideos = videoStorageManager.getUserVideos(userId);
    setVideos(userVideos);
    setStats(videoStorageManager.getStorageStats());
  }, [userId]);

  useEffect(() => {
    loadData();
    
    // Poll for updates while videos are processing
    const interval = setInterval(() => {
      const processingVideos = videos.filter(v => v.status === 'processing');
      if (processingVideos.length > 0) {
        loadData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [loadData, videos]);

  // Filter videos
  const filteredVideos = videos.filter(video => {
    const matchesSearch = 
      video.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || video.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(file => {
        const options: VideoUploadOptions = {
          generateThumbnail: true,
          optimizeForStreaming: true,
          maxSize: 500 * 1024 * 1024, // 500MB
          maxDuration: 600 // 10 minutes
        };
        
        return videoStorageManager.uploadVideo(file, userId, options);
      });
      
      await Promise.all(uploadPromises);
      loadData();
    } catch (error) {
      console.error('Upload failed:', error);
      // You would show an error toast here
    } finally {
      setUploading(false);
    }
  };

  // Handle video deletion
  const handleDeleteVideo = async (videoId: string) => {
    try {
      await videoStorageManager.deleteVideo(videoId);
      loadData();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Handle batch actions
  const handleBatchDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedVideos).map(id => videoStorageManager.deleteVideo(id))
      );
      setSelectedVideos(new Set());
      loadData();
    } catch (error) {
      console.error('Batch delete failed:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Video Management</h2>
          <p className="text-muted-foreground">
            Manage your uploaded and generated videos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.totalVideos}</div>
              <div className="text-sm text-muted-foreground">Total Videos</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
              <div className="text-sm text-muted-foreground">Storage Used</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold">{stats.readyVideos}</div>
              <div className="text-sm text-muted-foreground">Ready</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold">{stats.processingVideos}</div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div className="text-2xl font-bold">{stats.failedVideos}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Videos</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
            <TabsTrigger value="generated">AI Generated</TabsTrigger>
          </TabsList>

          {/* Batch Actions */}
          {selectedVideos.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedVideos.size} selected
              </span>
              <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="all" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Status</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Videos Display */}
          {viewMode === 'grid' ? (
            <VideoGrid 
              videos={filteredVideos}
              selectedVideos={selectedVideos}
              onSelectVideo={(id, selected) => {
                const newSelected = new Set(selectedVideos);
                if (selected) {
                  newSelected.add(id);
                } else {
                  newSelected.delete(id);
                }
                setSelectedVideos(newSelected);
              }}
              onDeleteVideo={handleDeleteVideo}
            />
          ) : (
            <VideoList 
              videos={filteredVideos}
              selectedVideos={selectedVideos}
              onSelectVideo={(id, selected) => {
                const newSelected = new Set(selectedVideos);
                if (selected) {
                  newSelected.add(id);
                } else {
                  newSelected.delete(id);
                }
                setSelectedVideos(newSelected);
              }}
              onDeleteVideo={handleDeleteVideo}
            />
          )}
        </TabsContent>

        <TabsContent value="upload">
          <VideoUploadArea 
            onUpload={handleFileUpload}
            uploading={uploading}
          />
        </TabsContent>

        <TabsContent value="generated">
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              AI-generated videos will appear here
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Video Grid Component
interface VideoGridProps {
  videos: VideoMetadata[];
  selectedVideos: Set<string>;
  onSelectVideo: (id: string, selected: boolean) => void;
  onDeleteVideo: (id: string) => void;
}

function VideoGrid({ videos, selectedVideos, onSelectVideo, onDeleteVideo }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">No videos found</div>
        <p className="text-sm text-muted-foreground">
          Upload your first video or adjust your search filters
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          selected={selectedVideos.has(video.id)}
          onSelect={(selected) => onSelectVideo(video.id, selected)}
          onDelete={() => onDeleteVideo(video.id)}
        />
      ))}
    </div>
  );
}

// Video List Component
interface VideoListProps {
  videos: VideoMetadata[];
  selectedVideos: Set<string>;
  onSelectVideo: (id: string, selected: boolean) => void;
  onDeleteVideo: (id: string) => void;
}

function VideoList({ videos, selectedVideos, onSelectVideo, onDeleteVideo }: VideoListProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">No videos found</div>
        <p className="text-sm text-muted-foreground">
          Upload your first video or adjust your search filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {videos.map((video) => (
        <VideoListItem
          key={video.id}
          video={video}
          selected={selectedVideos.has(video.id)}
          onSelect={(selected) => onSelectVideo(video.id, selected)}
          onDelete={() => onDeleteVideo(video.id)}
        />
      ))}
    </div>
  );
}

// Individual Video Card
interface VideoCardProps {
  video: VideoMetadata;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: () => void;
}

function VideoCard({ video, selected, onSelect, onDelete }: VideoCardProps) {
  const getStatusIcon = () => {
    switch (video.status) {
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'uploading': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        relative group border rounded-lg overflow-hidden transition-all duration-200
        ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
      `}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.originalName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        {/* Status overlay */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            {getStatusIcon()}
            <span className="ml-1 capitalize">{video.status}</span>
          </Badge>
        </div>

        {/* Duration */}
        {video.duration && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs">
              {formatDuration(video.duration)}
            </Badge>
          </div>
        )}

        {/* Selection checkbox */}
        <div className="absolute top-2 right-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="rounded"
          />
        </div>

        {/* Processing progress */}
        {video.status === 'processing' && video.processingProgress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50">
            <div className="h-1 bg-primary" style={{ width: `${video.processingProgress}%` }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="font-medium truncate mb-1">{video.originalName}</h4>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{formatFileSize(video.size)}</div>
          {video.resolution && (
            <div>{video.resolution.width}x{video.resolution.height}</div>
          )}
          <div>
            {new Date(video.uploadedAt).toLocaleDateString()}
          </div>
        </div>

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {video.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {video.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{video.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          <Button variant="secondary" size="sm">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Video List Item
interface VideoListItemProps {
  video: VideoMetadata;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: () => void;
}

function VideoListItem({ video, selected, onSelect, onDelete }: VideoListItemProps) {
  // Similar implementation to VideoCard but in list format
  return (
    <div className={`
      flex items-center gap-4 p-4 border rounded-lg
      ${selected ? 'border-primary bg-primary/5' : 'border-border'}
    `}>
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="rounded"
      />

      {/* Thumbnail */}
      <div className="w-16 h-12 bg-muted rounded flex items-center justify-center shrink-0">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.originalName}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <Play className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{video.originalName}</h4>
        <div className="text-sm text-muted-foreground">
          {new Date(video.uploadedAt).toLocaleDateString()} • {video.size} bytes
        </div>
      </div>

      {/* Status */}
      <Badge variant="secondary">
        {video.status}
      </Badge>

      {/* Actions */}
      <Button variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Video Upload Area
interface VideoUploadAreaProps {
  onUpload: (files: FileList) => void;
  uploading: boolean;
}

function VideoUploadArea({ onUpload, uploading }: VideoUploadAreaProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onUpload(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files);
    }
  };

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-12 text-center transition-colors
        ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}
        ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'}
      `}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      
      <h3 className="text-lg font-semibold mb-2">Upload Videos</h3>
      <p className="text-muted-foreground mb-6">
        Drag and drop video files here, or click to select files
      </p>
      
      <div className="space-y-2">
        <Button disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Choose Files'}
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileInput}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploading}
          />
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Supports MP4, WebM, MOV, AVI, MKV • Max 500MB per file
        </p>
      </div>
    </div>
  );
} 