'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Phone, 
  PhoneOff,
  Settings,
  Loader2,
  Pause,
  Play,
  Square,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
// import { SpeechRecognition } from '@/lib/audio/SpeechRecognition';
// import { TextToSpeech, VoiceOption } from '@/lib/audio/TextToSpeech';
// import { getLanguageManager, SupportedLanguage } from '@/lib/i18n/MultiLanguageSupport';

// Temporary placeholders for deployment
const SpeechRecognition = class { 
  start() { return Promise.resolve(); }
  stop() { return Promise.resolve(); }
  on() { return this; }
};
const TextToSpeech = class {
  speak() { return Promise.resolve(); }
  stop() { return Promise.resolve(); }
  getVoices() { return Promise.resolve([]); }
};
const getLanguageManager = () => ({
  getCurrentLanguage: () => 'en',
  translateText: (text: string) => Promise.resolve(text)
});
type VoiceOption = any;
type SupportedLanguage = string;

interface RealtimeVoiceChatProps {
  onMessage?: (message: string, isUser: boolean) => void;
  selectedModel: string;
  disabled?: boolean;
  className?: string;
}

type ChatState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
}

export function RealtimeVoiceChat({ 
  onMessage, 
  selectedModel, 
  disabled = false,
  className = ''
}: RealtimeVoiceChatProps) {
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>('nova');
  const [speed, setSpeed] = useState(1.0);
  const [autoResponse, setAutoResponse] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage>('en');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage | 'auto'>('auto');
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const speechRecognition = useRef<SpeechRecognition | null>(null);
  const textToSpeech = useRef<TextToSpeech | null>(null);
  const isProcessing = useRef(false);
  const languageManager = useRef(getLanguageManager());

  useEffect(() => {
    textToSpeech.current = new TextToSpeech();
    return () => {
      cleanupVoiceChat();
    };
  }, []);

  useEffect(() => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
    }
    
    if (isListening && autoResponse) {
      // Auto-stop listening after 5 seconds of silence
      const timer = setTimeout(() => {
        if (currentTranscript.trim()) {
          handleStopListening();
        }
      }, 5000);
      setSilenceTimer(timer);
    }
  }, [isListening, currentTranscript, autoResponse]);

  const startVoiceChat = async () => {
    try {
      // Check browser support with detailed information
      const supportInfo = SpeechRecognition.getSupportInfo();
      if (!supportInfo.supported) {
        const errorMsg = `Voice chat not supported: ${supportInfo.issues.join(', ')}. ${supportInfo.recommendations.join(' ')}`;
        throw new Error(errorMsg);
      }

      setIsVoiceChatActive(true);
      setChatState('listening');
      setErrorMessage('');
      
      // Initialize speech recognition
      speechRecognition.current = new SpeechRecognition();
      await speechRecognition.current.startRecording();
      setIsListening(true);
      
      console.log('🎙️ Real-time voice chat started');
    } catch (error: any) {
      console.error('❌ Failed to start voice chat:', error);
      setIsVoiceChatActive(false);
      setIsListening(false);
      
      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.name === 'AudioSourceError') {
        // Use the detailed error message from SpeechRecognition
        userMessage = error.message;
      } else if (error.message.includes('not supported')) {
        userMessage = 'Voice chat is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.';
      } else if (error.message.includes('HTTPS')) {
        userMessage = 'Voice chat requires a secure connection (HTTPS). Please reload the page or contact support.';
      }
      
      setErrorMessage(userMessage);
      setChatState('error');
    }
  };

  const stopVoiceChat = async () => {
    try {
      setIsVoiceChatActive(false);
      setChatState('idle');
      cleanupVoiceChat();
      console.log('🔇 Real-time voice chat stopped');
    } catch (error: any) {
      console.error('❌ Failed to stop voice chat:', error);
      setErrorMessage(error.message);
    }
  };

  const cleanupVoiceChat = () => {
    if (speechRecognition.current) {
      speechRecognition.current.cancelRecording();
      speechRecognition.current = null;
    }
    
    if (textToSpeech.current) {
      textToSpeech.current.stopCurrentAudio();
    }
    
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
    
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
    isProcessing.current = false;
  };

  const handleStopListening = async () => {
    if (!speechRecognition.current || isProcessing.current) return;
    
    try {
      isProcessing.current = true;
      setIsListening(false);
      setChatState('processing');
      
      // Stop recording and get transcript
      const audioBlob = await speechRecognition.current.stopRecording();
      const transcriptionLanguage = selectedLanguage === 'auto' ? undefined : selectedLanguage;
      const result = await speechRecognition.current.transcribe(audioBlob, transcriptionLanguage);
      
      if (result.text.trim()) {
        // Detect language and update state
        const detectedLang = result.language ? 
          result.language as SupportedLanguage : 
          languageManager.current.detectLanguageFromText(result.text);
        setDetectedLanguage(detectedLang);
        
        // Check for voice commands in detected language
        const voiceCommand = languageManager.current.detectVoiceCommand(result.text, detectedLang);
        
        if (voiceCommand) {
          await handleVoiceCommand(voiceCommand, result.text);
        } else {
          const userMessage: VoiceMessage = {
            id: Date.now().toString(),
            text: result.text,
            isUser: true,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, userMessage]);
          onMessage?.(result.text, true);
          setCurrentTranscript('');
          
          // Get AI response with language context
          await processAIResponse(result.text, detectedLang);
        }
      }
      
      // Restart listening if auto-response is enabled
      if (autoResponse && isVoiceChatActive) {
        setTimeout(() => {
          restartListening();
        }, 500);
      } else {
        setChatState('idle');
        // When auto-response is off, user can manually start listening again
      }
    } catch (error: any) {
      console.error('❌ Voice processing error:', error);
      setErrorMessage(error.message);
      setChatState('error');
    } finally {
      isProcessing.current = false;
    }
  };

  const handleVoiceCommand = async (command: any, originalText: string) => {
    console.log(`🎙️ Voice command detected: ${command.action}`);
    
    switch (command.action) {
      case 'SEND':
        // Already processed in normal flow
        break;
      case 'CLEAR':
        setMessages([]);
        setCurrentTranscript('');
        break;
      case 'NEW_CHAT':
        setMessages([]);
        setCurrentTranscript('');
        // Could trigger parent new chat handler
        break;
      case 'SWITCH_MODEL':
        // Could trigger model selector
        break;
      case 'STOP':
        interruptAI();
        break;
      case 'REPEAT':
        // Repeat last AI response
        const lastAIMessage = messages.filter(m => !m.isUser).slice(-1)[0];
        if (lastAIMessage) {
          await speakResponse(lastAIMessage.text);
        }
        break;
    }
  };

  const processAIResponse = async (userMessage: string, language: SupportedLanguage = 'en') => {
    try {
      setChatState('processing');
      
      // Build conversation context from recent voice messages
      const recentMessages = messages.slice(-5); // Last 5 messages for context
      let conversationContext = '';
      
      if (recentMessages.length > 0) {
        conversationContext = '\n\nRecent conversation:\n' + 
          recentMessages.map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`).join('\n');
      }
      
      // Enhance message with comprehensive context for voice chat
      let enhancedMessage = '';
      
      if (userMessage.trim().length < 15) {
        // For very short messages, provide extensive context
        enhancedMessage = `[VOICE CHAT SESSION] 
The user is speaking to you via voice chat in ${languageManager.current.getSupportedLanguages().find(l => l.code === language)?.name || language}. 

User just said: "${userMessage}"

This is a very short voice message. Please interpret it in the context of our ongoing conversation and respond naturally and conversationally. Even single words or short phrases deserve thoughtful, helpful responses.

${conversationContext}

Please respond in ${language === 'en' ? 'English' : languageManager.current.getSupportedLanguages().find(l => l.code === language)?.name || 'the detected language'} in a natural, conversational way suitable for voice chat.`;
      } else if (userMessage.trim().length < 50) {
        // For medium messages, provide moderate context
        enhancedMessage = `[VOICE CHAT] The user is speaking via voice chat in ${language.toUpperCase()}.

User said: "${userMessage}"

${conversationContext}

Please respond naturally and conversationally in ${language === 'en' ? 'English' : 'the same language'}.`;
      } else {
        // For longer messages, minimal enhancement
        enhancedMessage = `[Voice Chat in ${language.toUpperCase()}] ${userMessage}

${conversationContext ? conversationContext : ''}

Please respond conversationally.`;
      }
      
      console.log('🎙️ Sending enhanced voice message to API:', {
        originalMessage: userMessage,
        messageLength: userMessage.length,
        language: language,
        model: selectedModel,
        recentMessageCount: recentMessages.length
      });
      
      // Create comprehensive message array for voice chat
      const voiceChatSystemMessage = {
        role: 'system' as const,
        content: `You are an AI assistant in a voice chat conversation. The user is speaking to you naturally via voice, and you should respond conversationally and helpfully. 

Key guidelines for voice chat:
- Respond naturally as if you're having a spoken conversation
- Keep responses concise but helpful (aim for 1-3 sentences unless more detail is needed)
- Be engaging and personable
- Acknowledge the voice chat context when appropriate
- If the user says something very brief, interpret it in context
- Respond in ${language === 'en' ? 'English' : languageManager.current.getSupportedLanguages().find(l => l.code === language)?.name || 'the same language as the user'}

Current voice chat session - respond appropriately to what the user just said.`
      };

      const voiceChatMessages = [
        voiceChatSystemMessage,
        { role: 'user' as const, content: enhancedMessage }
      ];

      // Send to chat API with memory context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: voiceChatMessages,
          model: selectedModel,
          stream: false, // Use non-streaming for voice
          includeMemory: true, // Enable RAG memory retrieval
          voiceChat: true, // Flag for voice-specific processing
          language: language, // Detected language for context
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      
      // Handle different response formats from the API
      let aiResponse = '';
      if (data.choices?.[0]?.message?.content) {
        aiResponse = data.choices[0].message.content;
      } else if (data.message) {
        aiResponse = data.message;
      } else if (data.content) {
        aiResponse = data.content;
      } else {
        aiResponse = 'I apologize, but I had trouble processing your voice message. Could you please try speaking again?';
      }
      
      console.log('🤖 AI Response received:', {
        responseLength: aiResponse.length,
        apiResponse: data,
        extractedContent: aiResponse.substring(0, 100) + '...'
      });
      
      const aiMessage: VoiceMessage = {
        id: Date.now().toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      onMessage?.(aiResponse, false);
      
      // Speak the response
      await speakResponse(aiResponse);
      
    } catch (error: any) {
      console.error('❌ AI response error:', error);
      setErrorMessage(error.message);
      setChatState('error');
    }
  };

  const speakResponse = async (text: string) => {
    try {
      if (!textToSpeech.current) return;
      
      setChatState('speaking');
      setIsSpeaking(true);
      
      const playbackControls = await textToSpeech.current.playText(text, {
        voice: selectedVoice,
        speed: speed,
      });
      
      playbackControls.setVolume(volume);
      await playbackControls.play();
      
      // Wait for speech to complete
      const checkSpeechComplete = setInterval(() => {
        if (!playbackControls.isPlaying()) {
          clearInterval(checkSpeechComplete);
          setIsSpeaking(false);
          setChatState('idle');
        }
      }, 100);
      
    } catch (error: any) {
      console.error('❌ Speech synthesis error:', error);
      setErrorMessage(error.message);
      setIsSpeaking(false);
      setChatState('error');
    }
  };

  const restartListening = async () => {
    if (!isVoiceChatActive) return;
    
    try {
      setErrorMessage(''); // Clear any previous errors
      speechRecognition.current = new SpeechRecognition();
      await speechRecognition.current.startRecording();
      setIsListening(true);
      setChatState('listening');
    } catch (error: any) {
      console.error('❌ Failed to restart listening:', error);
      
      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.name === 'AudioSourceError') {
        userMessage = error.message;
      }
      
      setErrorMessage(userMessage);
      setChatState('error');
    }
  };

  const startManualListening = async () => {
    if (!isVoiceChatActive || isListening || isProcessing.current) return;
    
    try {
      setErrorMessage('');
      speechRecognition.current = new SpeechRecognition();
      await speechRecognition.current.startRecording();
      setIsListening(true);
      setChatState('listening');
      console.log('🎙️ Manual listening started');
    } catch (error: any) {
      console.error('❌ Failed to start manual listening:', error);
      
      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.name === 'AudioSourceError') {
        userMessage = error.message;
      } else if (error.message.includes('denied')) {
        userMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
      }
      
      setErrorMessage(userMessage);
      setChatState('error');
    }
  };

  const interruptAI = () => {
    if (textToSpeech.current) {
      textToSpeech.current.stopCurrentAudio();
      setIsSpeaking(false);
      setChatState('idle');
    }
  };

  const getStatusColor = () => {
    switch (chatState) {
      case 'listening': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'speaking': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    return languageManager.current.getStatusText(chatState, detectedLanguage);
  };

  const voices = TextToSpeech.getAvailableVoices();
  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1.0, label: '1x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
    { value: 2.0, label: '2x' },
  ];

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold">Real-time Voice Chat</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()} mr-1`} />
            {getStatusText()}
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className={showSettings ? 'bg-muted' : ''}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0">
              ⚠️
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium mb-1">Voice Chat Error</p>
              <p className="text-sm text-red-600">{errorMessage}</p>
              {errorMessage.includes('microphone') && (
                <div className="mt-2 text-xs text-red-500">
                  <p className="font-medium">Troubleshooting tips:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Check if your microphone is connected and working</li>
                    <li>Allow microphone permissions when prompted</li>
                    <li>Close other applications that might be using the microphone</li>
                    <li>Try refreshing the page</li>
                  </ul>
                </div>
              )}
              {chatState === 'error' && (
                <Button
                  onClick={() => {
                    setErrorMessage('');
                    setChatState('idle');
                    setIsVoiceChatActive(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-muted rounded-lg"
          >
            <div className="space-y-4">
              {/* Language Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Language {detectedLanguage !== 'en' && `(Detected: ${detectedLanguage.toUpperCase()})`}
                </label>
                <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto Detect</SelectItem>
                    {languageManager.current.getSupportedLanguages().map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.nativeName} ({lang.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice and Speed Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Voice</label>
                  <Select value={selectedVoice} onValueChange={(value: VoiceOption) => setSelectedVoice(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name} {voice.id === languageManager.current.getOptimalTTSVoice(detectedLanguage) && '⭐'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Speed</label>
                  <Select value={speed.toString()} onValueChange={(value) => setSpeed(parseFloat(value))}>
                    <SelectTrigger>
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
                </div>
              </div>
              
              {/* Volume Slider */}
              <div>
                <label className="text-sm font-medium mb-2 block">Volume: {Math.round(volume * 100)}%</label>
                <div className="px-2 py-2">
                  <Slider
                    value={[volume * 100]}
                    onValueChange={(value) => setVolume(value[0] / 100)}
                    min={0}
                    max={100}
                    step={10}
                    className="w-full h-6"
                  />
                </div>
              </div>
              
              {/* Auto-response Toggle */}
              <div className="flex items-center justify-between p-2 bg-background rounded-lg border">
                <div>
                  <label className="text-sm font-medium">Auto-response</label>
                  <p className="text-xs text-muted-foreground">
                    {autoResponse 
                      ? "AI responds automatically after you speak" 
                      : "Manual control - click 'Start Listening' to talk"
                    }
                  </p>
                </div>
                <Switch 
                  checked={autoResponse} 
                  onCheckedChange={setAutoResponse}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {!isVoiceChatActive ? (
          <Button
            onClick={startVoiceChat}
            disabled={disabled || chatState === 'error'}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
          >
            <Phone className="w-5 h-5" />
            {chatState === 'error' ? 'Fix Error First' : 'Start Voice Chat'}
          </Button>
        ) : (
          <>
            <Button
              onClick={stopVoiceChat}
              variant="destructive"
              className="flex items-center gap-2 px-6 py-3"
            >
              <PhoneOff className="w-5 h-5" />
              End Chat
            </Button>
            
            {isSpeaking && (
              <Button
                onClick={interruptAI}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Interrupt
              </Button>
            )}
            
            {isListening && !autoResponse && (
              <Button
                onClick={handleStopListening}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MicOff className="w-4 h-4" />
                Stop Listening
              </Button>
            )}

            {/* Manual Start Listening Button - shows when auto-response is off and not currently listening */}
            {!autoResponse && !isListening && !isSpeaking && chatState === 'idle' && (
              <Button
                onClick={startManualListening}
                variant="outline"
                className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
              >
                <Mic className="w-4 h-4" />
                Start Listening
              </Button>
            )}
          </>
        )}
      </div>

      {/* Current Transcript */}
      {currentTranscript && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">{currentTranscript}</p>
        </div>
      )}

      {/* Voice Messages */}
      {messages.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.slice(-5).map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Indicators */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-sm text-muted-foreground">Listening</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${chatState === 'processing' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-sm text-muted-foreground">Processing</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-sm text-muted-foreground">Speaking</span>
        </div>

        {/* Auto-response indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${autoResponse ? 'bg-purple-500' : 'bg-orange-500'}`} />
          <span className="text-sm text-muted-foreground">
            {autoResponse ? 'Auto' : 'Manual'}
          </span>
        </div>
      </div>
    </Card>
  );
}