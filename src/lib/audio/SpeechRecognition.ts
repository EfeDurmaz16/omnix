export class SpeechRecognition {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;

  async startRecording(): Promise<void> {
    try {
      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.');
      }

      // Check for HTTPS requirement
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Microphone access requires HTTPS. Please use a secure connection.');
      }

      console.log('🎤 Requesting microphone access...');

      // Request microphone access with fallback constraints
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000 // Optimal for Whisper
          } 
        });
        console.log('✅ Advanced audio constraints successful');
      } catch (constraintError) {
        console.warn('⚠️ Advanced audio constraints failed, trying basic audio:', constraintError);
        try {
          // Fallback to basic audio constraints
          this.stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true
          });
          console.log('✅ Basic audio constraints successful');
        } catch (basicError) {
          console.error('❌ Basic audio access failed:', basicError);
          throw this.createDetailedAudioError(basicError);
        }
      }

      // Verify stream is active
      if (!this.stream || this.stream.getTracks().length === 0) {
        throw new Error('No audio tracks available. Please check your microphone connection.');
      }

      const audioTrack = this.stream.getAudioTracks()[0];
      if (!audioTrack || audioTrack.readyState !== 'live') {
        throw new Error('Audio track is not active. Please check your microphone permissions and try again.');
      }

      console.log('✅ Microphone access granted, audio track state:', audioTrack.readyState);

      // Create MediaRecorder with fallback options
      let mediaRecorderOptions: MediaRecorderOptions | undefined;
      
      // Try different MIME types in order of preference for Whisper compatibility
      // Whisper supports: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
      const mimeTypes = [
        'audio/webm;codecs=opus',  // Best for web, supported by Whisper
        'audio/webm',              // Fallback webm
        'audio/mp4',               // Good compatibility
        'audio/ogg;codecs=opus',   // Opus codec in OGG
        'audio/ogg',               // Basic OGG
        'audio/wav',               // Uncompressed, widely supported
        'audio/mpeg'               // MP3 format
      ];
      
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          mediaRecorderOptions = { mimeType };
          console.log('✅ Using MIME type:', mimeType);
          break;
        }
      }

      if (!mediaRecorderOptions) {
        console.warn('⚠️ No preferred MIME types supported, using browser default');
      }

      try {
        this.mediaRecorder = mediaRecorderOptions 
          ? new MediaRecorder(this.stream, mediaRecorderOptions)
          : new MediaRecorder(this.stream);
        
        console.log('✅ MediaRecorder created with MIME type:', this.mediaRecorder.mimeType);
      } catch (recorderError) {
        console.error('❌ MediaRecorder creation failed:', recorderError);
        throw new Error('Could not create audio recorder. Your browser may not support audio recording.');
      }

      // Clear previous chunks
      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log('📊 Audio chunk received:', event.data.size, 'bytes');
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        this.cleanup();
      };

      // Start recording
      try {
        this.mediaRecorder.start(100); // Collect data every 100ms
        this.isRecording = true;
        console.log('🎤 Recording started successfully');
      } catch (startError) {
        console.error('❌ Failed to start MediaRecorder:', startError);
        throw new Error('Could not start audio recording. Please try refreshing the page.');
      }

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.cleanup(); // Ensure cleanup on any error
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No active recording to stop'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          // Create audio blob from chunks using the same MIME type as the recorder
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          
          // Clean up
          this.cleanup();
          
          console.log('🎤 Recording stopped, blob size:', audioBlob.size, 'bytes, type:', mimeType);
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  async transcribe(audioBlob: Blob, preferredLanguage?: string): Promise<{ text: string; command?: string; language?: string }> {
    try {
      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid or empty audio data');
      }
      
      // Determine the correct file extension and MIME type
      let filename = 'recording.webm';
      let mimeType = audioBlob.type || '';
      
      console.log('🔍 Original audio blob:', {
        type: mimeType,
        size: audioBlob.size,
        hasType: !!audioBlob.type
      });
      
      // Map MIME types to supported extensions (OpenAI Whisper compatible)
      if (mimeType.includes('webm')) {
        filename = 'recording.webm';
      } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
        filename = 'recording.mp4';
      } else if (mimeType.includes('ogg')) {
        filename = 'recording.ogg';
      } else if (mimeType.includes('wav')) {
        filename = 'recording.wav';
      } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
        filename = 'recording.mp3';
      } else if (mimeType.includes('flac')) {
        filename = 'recording.flac';
      } else if (!mimeType || mimeType === '') {
        // No MIME type provided, use webm as safe default
        console.warn('⚠️ No MIME type provided, defaulting to webm');
        filename = 'recording.webm';
        mimeType = 'audio/webm';
      } else {
        // Unknown MIME type, use webm as fallback
        console.warn('⚠️ Unknown audio type, defaulting to webm:', mimeType);
        filename = 'recording.webm';
      }
      
      console.log('🎵 Audio format mapping:', mimeType, '→', filename);
      
      // Ensure minimum audio size (at least 1KB for a valid audio file)
      if (audioBlob.size < 1000) {
        throw new Error('Audio recording too short or corrupted. Please try speaking for longer.');
      }

      // Create a new blob with the correct MIME type if needed
      const correctedBlob = mimeType !== audioBlob.type 
        ? new Blob([audioBlob], { type: mimeType })
        : audioBlob;

      const formData = new FormData();
      formData.append('audio', correctedBlob, filename);

      console.log('📤 Sending audio for transcription with filename:', filename);

      // Add language preference if specified
      const url = preferredLanguage 
        ? `/api/speech/transcribe?language=${preferredLanguage}`
        : '/api/speech/transcribe';

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Transcription API error:', errorData);
        throw new Error(errorData.error || 'Transcription failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Transcription failed');
      }

      console.log('✅ Transcription received:', result.text.substring(0, 100) + '...');
      console.log('🌍 Detected language:', result.language);
      
      // Check for voice commands (currently English only, could be extended)
      const command = this.detectVoiceCommand(result.text, result.language);
      
      return { 
        text: result.text, 
        command: command || undefined,
        language: result.language
      };

    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw error;
    }
  }

  private detectVoiceCommand(text: string, language: string = 'en'): string | null {
    const lowercaseText = text.toLowerCase().trim();
    
    // Voice commands in multiple languages
    const commandsByLanguage: Record<string, Record<string, string>> = {
      en: {
        'send message': 'SEND',
        'send it': 'SEND',
        'submit': 'SEND',
        'that\'s all': 'SEND',
        'i\'m done': 'SEND',
        'finished': 'SEND',
        'end message': 'SEND',
        'complete': 'SEND',
        'clear text': 'CLEAR',
        'clear message': 'CLEAR',
        'delete all': 'CLEAR',
        'new chat': 'NEW_CHAT',
        'new conversation': 'NEW_CHAT',
        'start over': 'NEW_CHAT',
        'switch model': 'SWITCH_MODEL',
        'change model': 'SWITCH_MODEL',
        'use different model': 'SWITCH_MODEL'
      },
      tr: {
        'mesajı gönder': 'SEND',
        'gönder': 'SEND',
        'bitti': 'SEND',
        'tamamlandı': 'SEND',
        'bu kadar': 'SEND',
        'metni temizle': 'CLEAR',
        'sil': 'CLEAR',
        'yeni sohbet': 'NEW_CHAT',
        'yeni konuşma': 'NEW_CHAT',
        'baştan başla': 'NEW_CHAT',
        'model değiştir': 'SWITCH_MODEL',
        'farklı model': 'SWITCH_MODEL'
      },
      fr: {
        'envoyer message': 'SEND',
        'envoyer': 'SEND',
        'c\'est tout': 'SEND',
        'terminé': 'SEND',
        'fini': 'SEND',
        'effacer texte': 'CLEAR',
        'supprimer': 'CLEAR',
        'nouveau chat': 'NEW_CHAT',
        'nouvelle conversation': 'NEW_CHAT',
        'recommencer': 'NEW_CHAT',
        'changer modèle': 'SWITCH_MODEL'
      },
      es: {
        'enviar mensaje': 'SEND',
        'enviar': 'SEND',
        'eso es todo': 'SEND',
        'terminado': 'SEND',
        'listo': 'SEND',
        'borrar texto': 'CLEAR',
        'eliminar': 'CLEAR',
        'nuevo chat': 'NEW_CHAT',
        'nueva conversación': 'NEW_CHAT',
        'empezar de nuevo': 'NEW_CHAT',
        'cambiar modelo': 'SWITCH_MODEL'
      }
    };

    const commands = commandsByLanguage[language] || commandsByLanguage['en'];

    for (const [phrase, command] of Object.entries(commands)) {
      if (lowercaseText.includes(phrase)) {
        return command;
      }
    }

    return null;
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.cleanup();
    }
  }

  private cleanup(): void {
    try {
      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Stopped audio track:', track.kind, track.label);
        });
        this.stream = null;
      }

      // Clear recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.isRecording = false;

      console.log('🧹 Audio recording cleanup completed');
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error);
    }
  }

  // Helper method to create detailed error messages
  private createDetailedAudioError(originalError: any): Error {
    let message = 'Could not start audio source. ';
    
    if (originalError?.name === 'NotAllowedError') {
      message += 'Microphone access was denied. Please allow microphone permissions and try again.';
    } else if (originalError?.name === 'NotFoundError') {
      message += 'No microphone was found. Please connect a microphone and try again.';
    } else if (originalError?.name === 'NotReadableError') {
      message += 'Microphone is being used by another application. Please close other apps using the microphone.';
    } else if (originalError?.name === 'OverconstrainedError') {
      message += 'Microphone does not support the required audio settings. Trying with basic settings.';
    } else if (originalError?.name === 'SecurityError') {
      message += 'Microphone access blocked due to security restrictions. Please check your browser settings.';
    } else {
      message += `Unknown error: ${originalError?.message || 'Please check your microphone connection and permissions.'}`;
    }

    const error = new Error(message);
    error.name = 'AudioSourceError';
    return error;
  }

  get recording(): boolean {
    return this.isRecording;
  }

  // Static method to check if speech recognition is supported
  static isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' && 
      navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia &&
      typeof window !== 'undefined' && 
      typeof MediaRecorder !== 'undefined'
    );
  }

  // Static method to get detailed browser support information
  static getSupportInfo(): {
    supported: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (typeof navigator === 'undefined') {
      issues.push('Navigator not available');
    }

    if (!navigator.mediaDevices) {
      issues.push('MediaDevices API not available');
      recommendations.push('Use a modern browser (Chrome 47+, Firefox 36+, Safari 11+)');
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      issues.push('getUserMedia not available');
      recommendations.push('Enable microphone permissions in browser settings');
    }

    if (typeof MediaRecorder === 'undefined') {
      issues.push('MediaRecorder API not available');
      recommendations.push('Update your browser to a recent version');
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push('Insecure connection');
      recommendations.push('Use HTTPS for microphone access');
    }

    return {
      supported: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Quick transcription method that handles the full flow
  static async quickTranscribe(onStart?: () => void, onStop?: () => void, language?: string): Promise<{ text: string; command?: string; language?: string }> {
    const recorder = new SpeechRecognition();
    
    try {
      onStart?.();
      await recorder.startRecording();
      
      // For demo purposes, auto-stop after 10 seconds
      // In practice, you'd want user-controlled stop
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const audioBlob = await recorder.stopRecording();
      onStop?.();
      
      return await recorder.transcribe(audioBlob, language);
    } catch (error) {
      onStop?.();
      throw error;
    }
  }
} 