export type VoiceOption = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface SpeechOptions {
  voice?: VoiceOption;
  speed?: number; // 0.25 to 4.0
}

export interface AudioPlaybackControls {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
  isPaused: () => boolean;
}

export class TextToSpeech {
  private currentAudio: HTMLAudioElement | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window !== 'undefined' && 'Audio' in window) {
      this.isInitialized = true;
    }
  }

  async synthesizeText(text: string, options: SpeechOptions = {}): Promise<string> {
    try {
      console.log('🔊 Synthesizing text:', text.substring(0, 50) + '...');

      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: options.voice || 'alloy',
          speed: options.speed || 1.0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Speech synthesis failed');
      }

      // Create blob URL for audio playback
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log('✅ Speech synthesis completed');
      return audioUrl;

    } catch (error) {
      console.error('❌ TTS synthesis error:', error);
      throw error;
    }
  }

  async playText(text: string, options: SpeechOptions = {}): Promise<AudioPlaybackControls> {
    if (!this.isInitialized) {
      throw new Error('TextToSpeech not supported in this environment');
    }

    try {
      // Stop any currently playing audio
      this.stopCurrentAudio();

      // Synthesize the text
      const audioUrl = await this.synthesizeText(text, options);

      // Create new audio element
      this.currentAudio = new Audio(audioUrl);
      
      // Set up audio event listeners
      this.currentAudio.addEventListener('ended', () => {
        this.cleanup();
      });

      this.currentAudio.addEventListener('error', (e) => {
        console.error('❌ Audio playback error:', e);
        this.cleanup();
      });

      // Return playback controls
      return this.createPlaybackControls(this.currentAudio);

    } catch (error) {
      console.error('❌ TTS playback error:', error);
      throw error;
    }
  }

  private createPlaybackControls(audio: HTMLAudioElement): AudioPlaybackControls {
    return {
      play: async () => {
        try {
          await audio.play();
        } catch (error) {
          console.error('❌ Audio play error:', error);
          throw error;
        }
      },

      pause: () => {
        audio.pause();
      },

      stop: () => {
        audio.pause();
        audio.currentTime = 0;
        this.cleanup();
      },

      setVolume: (volume: number) => {
        audio.volume = Math.max(0, Math.min(1, volume));
      },

      getCurrentTime: () => audio.currentTime,

      getDuration: () => audio.duration || 0,

      isPlaying: () => !audio.paused && !audio.ended,

      isPaused: () => audio.paused && audio.currentTime > 0,
    };
  }

  stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanup();
    }
  }

  private cleanup(): void {
    if (this.currentAudio && this.currentAudio.src) {
      // Revoke blob URL to free memory
      URL.revokeObjectURL(this.currentAudio.src);
    }
    this.currentAudio = null;
  }

  // Voice options for UI
  static getAvailableVoices(): Array<{ id: VoiceOption; name: string; description: string }> {
    return [
      { id: 'alloy', name: 'Alloy', description: 'Balanced and versatile' },
      { id: 'echo', name: 'Echo', description: 'Clear and articulate' },
      { id: 'fable', name: 'Fable', description: 'Warm and storytelling' },
      { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
      { id: 'nova', name: 'Nova', description: 'Energetic and modern' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle' },
    ];
  }

  // Check if browser supports TTS
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Audio' in window;
  }
} 