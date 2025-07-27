'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX,
  Loader2,
  Settings,
  Headphones
} from 'lucide-react';
// import { TextToSpeech, VoiceOption, AudioPlaybackControls } from '@/lib/audio/TextToSpeech';
// Temporary placeholders for deployment
const TextToSpeech = class {
  speak() { return Promise.resolve(); }
  stop() { return Promise.resolve(); }
  getVoices() { return Promise.resolve([]); }
};
type VoiceOption = any;
type AudioPlaybackControls = any;

interface VoiceControlsProps {
  text: string;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function VoiceControls({ 
  text, 
  onPlaybackStart, 
  onPlaybackEnd, 
  onError,
  className = ''
}: VoiceControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>('alloy');
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPlayback, setCurrentPlayback] = useState<AudioPlaybackControls | null>(null);
  const [tts] = useState(() => new TextToSpeech());

  useEffect(() => {
    // Update playback controls volume when changed
    if (currentPlayback) {
      currentPlayback.setVolume(volume);
    }
  }, [volume, currentPlayback]);

  const handlePlay = async () => {
    if (!text.trim()) {
      onError?.('No text to read');
      return;
    }

    try {
      setIsLoading(true);
      onPlaybackStart?.();

      const playbackControls = await tts.playText(text, {
        voice: selectedVoice,
        speed: speed,
      });

      setCurrentPlayback(playbackControls);
      playbackControls.setVolume(volume);
      
      await playbackControls.play();
      setIsPlaying(true);
      setIsPaused(false);

      // Monitor playback status
      const checkStatus = setInterval(() => {
        if (!playbackControls.isPlaying()) {
          clearInterval(checkStatus);
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentPlayback(null);
          onPlaybackEnd?.();
        }
      }, 100);

    } catch (error: any) {
      console.error('❌ Voice playback error:', error);
      onError?.(error.message || 'Failed to play audio');
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentPlayback(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    if (currentPlayback) {
      currentPlayback.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleResume = async () => {
    if (currentPlayback && isPaused) {
      try {
        await currentPlayback.play();
        setIsPlaying(true);
        setIsPaused(false);
      } catch (error: any) {
        onError?.(error.message || 'Failed to resume audio');
      }
    }
  };

  const handleStop = () => {
    if (currentPlayback) {
      currentPlayback.stop();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentPlayback(null);
      onPlaybackEnd?.();
    }
  };

  const voices = TextToSpeech.getAvailableVoices();
  const speedOptions = [
    { value: 0.5, label: '0.5x (Slow)' },
    { value: 0.75, label: '0.75x' },
    { value: 1.0, label: '1x (Normal)' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
    { value: 2.0, label: '2x (Fast)' },
  ];

  if (!TextToSpeech.isSupported()) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <VolumeX className="w-4 h-4" />
        <span>Audio not supported</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Main Play Controls */}
      <div className="flex items-center gap-1">
        {isLoading ? (
          <Button variant="ghost" size="sm" disabled>
            <Loader2 className="w-4 h-4 animate-spin" />
          </Button>
        ) : isPlaying ? (
          <Button variant="ghost" size="sm" onClick={handlePause}>
            <Pause className="w-4 h-4" />
          </Button>
        ) : isPaused ? (
          <Button variant="ghost" size="sm" onClick={handleResume}>
            <Play className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={handlePlay}>
            <Play className="w-4 h-4" />
          </Button>
        )}

        {(isPlaying || isPaused) && (
          <Button variant="ghost" size="sm" onClick={handleStop}>
            <Square className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Status Badge */}
      {isPlaying && (
        <Badge variant="secondary" className="text-xs">
          <Headphones className="w-3 h-3 mr-1" />
          Playing
        </Badge>
      )}

      {isPaused && (
        <Badge variant="outline" className="text-xs">
          Paused
        </Badge>
      )}

      {/* Settings Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSettings(!showSettings)}
        className={showSettings ? 'bg-muted' : ''}
      >
        <Settings className="w-4 h-4" />
      </Button>

      {/* Voice Settings */}
      {showSettings && (
        <div className="flex items-center gap-2 ml-2 p-2 bg-muted rounded-lg">
          {/* Voice Selection */}
          <Select value={selectedVoice} onValueChange={(value: VoiceOption) => setSelectedVoice(value)}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <div className="flex flex-col">
                    <span className="text-sm">{voice.name}</span>
                    <span className="text-xs text-muted-foreground">{voice.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Speed Selection */}
          <Select value={speed.toString()} onValueChange={(value) => setSpeed(parseFloat(value))}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {speedOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Volume Control */}
          <div className="flex items-center gap-1">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-2 bg-muted-foreground rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
} 