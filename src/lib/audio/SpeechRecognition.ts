export class SpeechRecognition {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;

  async startRecording(): Promise<void> {
    try {
      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording not supported in this browser');
      }

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for Whisper
        } 
      });

      // Create MediaRecorder
      const options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.warn('WebM not supported, falling back to default format');
        this.mediaRecorder = new MediaRecorder(this.stream);
      } else {
        this.mediaRecorder = new MediaRecorder(this.stream, options);
      }

      // Clear previous chunks
      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

      console.log('🎤 Recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
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
          // Create audio blob from chunks
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          
          // Clean up
          this.cleanup();
          
          console.log('🎤 Recording stopped, blob size:', audioBlob.size, 'bytes');
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
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      console.log('📤 Sending audio for transcription...');

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
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear recorder
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;

    console.log('🧹 Audio recording cleanup completed');
  }

  get recording(): boolean {
    return this.isRecording;
  }

  // Static method to check if speech recognition is supported
  static isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' && 
      navigator.mediaDevices && 
      typeof window !== 'undefined' && 
      typeof MediaRecorder !== 'undefined'
    );
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