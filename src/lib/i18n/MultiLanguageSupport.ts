/**
 * Multi-Language Support for Voice Chat and Context Management
 * Handles language detection, voice commands, and context formatting across languages
 */

export type SupportedLanguage = 
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' | 'ko' | 'zh' 
  | 'ar' | 'hi' | 'tr' | 'nl' | 'sv' | 'da' | 'no' | 'fi' | 'pl' | 'cs';

export interface VoiceCommand {
  command: string;
  action: 'SEND' | 'CLEAR' | 'NEW_CHAT' | 'SWITCH_MODEL' | 'STOP' | 'REPEAT';
}

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  voiceCommands: Record<string, string>;
  contextPrompts: {
    systemPrefix: string;
    memoryContext: string;
    voiceChatNote: string;
    processingStatus: string;
  };
  ttsVoicePreference: string[];
}

export class MultiLanguageManager {
  private languages: Map<SupportedLanguage, LanguageConfig> = new Map();
  private userLanguagePreferences: Map<string, SupportedLanguage> = new Map();

  constructor() {
    this.initializeLanguages();
    this.loadUserPreferences();
  }

  private initializeLanguages(): void {
    const configs: LanguageConfig[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        voiceCommands: {
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
          'stop speaking': 'STOP',
          'repeat that': 'REPEAT'
        },
        contextPrompts: {
          systemPrefix: 'You are a helpful AI assistant.',
          memoryContext: 'Voice Chat Context from Previous Conversations:',
          voiceChatNote: 'Note: User is speaking via voice chat - provide natural, conversational responses.',
          processingStatus: 'Processing with memory...'
        },
        ttsVoicePreference: ['nova', 'alloy', 'echo']
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        voiceCommands: {
          'enviar mensaje': 'SEND',
          'enviar': 'SEND',
          'envíalo': 'SEND',
          'borrar texto': 'CLEAR',
          'eliminar': 'CLEAR',
          'limpiar': 'CLEAR',
          'nuevo chat': 'NEW_CHAT',
          'nueva conversación': 'NEW_CHAT',
          'empezar de nuevo': 'NEW_CHAT',
          'cambiar modelo': 'SWITCH_MODEL',
          'parar de hablar': 'STOP',
          'repetir eso': 'REPEAT'
        },
        contextPrompts: {
          systemPrefix: 'Eres un asistente de IA útil.',
          memoryContext: 'Contexto de Chat de Voz de Conversaciones Anteriores:',
          voiceChatNote: 'Nota: El usuario está hablando por chat de voz - proporciona respuestas naturales y conversacionales.',
          processingStatus: 'Procesando con memoria...'
        },
        ttsVoicePreference: ['nova', 'shimmer', 'alloy']
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        voiceCommands: {
          'envoyer message': 'SEND',
          'envoyer': 'SEND',
          'envoie': 'SEND',
          'effacer texte': 'CLEAR',
          'supprimer': 'CLEAR',
          'effacer': 'CLEAR',
          'nouveau chat': 'NEW_CHAT',
          'nouvelle conversation': 'NEW_CHAT',
          'recommencer': 'NEW_CHAT',
          'changer modèle': 'SWITCH_MODEL',
          'arrêter de parler': 'STOP',
          'répéter ça': 'REPEAT'
        },
        contextPrompts: {
          systemPrefix: 'Vous êtes un assistant IA utile.',
          memoryContext: 'Contexte de Chat Vocal des Conversations Précédentes:',
          voiceChatNote: 'Note: L\'utilisateur parle via chat vocal - fournissez des réponses naturelles et conversationnelles.',
          processingStatus: 'Traitement avec mémoire...'
        },
        ttsVoicePreference: ['shimmer', 'nova', 'echo']
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        voiceCommands: {
          'nachricht senden': 'SEND',
          'senden': 'SEND',
          'abschicken': 'SEND',
          'text löschen': 'CLEAR',
          'löschen': 'CLEAR',
          'alles löschen': 'CLEAR',
          'neuer chat': 'NEW_CHAT',
          'neue unterhaltung': 'NEW_CHAT',
          'von vorne beginnen': 'NEW_CHAT',
          'modell wechseln': 'SWITCH_MODEL',
          'aufhören zu sprechen': 'STOP',
          'das wiederholen': 'REPEAT'
        },
        contextPrompts: {
          systemPrefix: 'Sie sind ein hilfreicher KI-Assistent.',
          memoryContext: 'Sprach-Chat-Kontext aus vorherigen Gesprächen:',
          voiceChatNote: 'Hinweis: Der Benutzer spricht über Sprach-Chat - geben Sie natürliche, gesprächige Antworten.',
          processingStatus: 'Verarbeitung mit Speicher...'
        },
        ttsVoicePreference: ['echo', 'onyx', 'alloy']
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        voiceCommands: {
          'メッセージを送信': 'SEND',
          '送信': 'SEND',
          'テキストをクリア': 'CLEAR',
          'クリア': 'CLEAR',
          '削除': 'CLEAR',
          '新しいチャット': 'NEW_CHAT',
          '新しい会話': 'NEW_CHAT',
          'やり直し': 'NEW_CHAT',
          'モデル変更': 'SWITCH_MODEL',
          '話すのを止める': 'STOP',
          'もう一度': 'REPEAT'
        },
        contextPrompts: {
          systemPrefix: 'あなたは役に立つAIアシスタントです。',
          memoryContext: '以前の会話からの音声チャットコンテキスト:',
          voiceChatNote: '注意: ユーザーは音声チャットで話しています - 自然で会話的な応答を提供してください。',
          processingStatus: 'メモリで処理中...'
        },
        ttsVoicePreference: ['nova', 'shimmer', 'alloy']
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        voiceCommands: {
          'mesajı gönder': 'SEND',
          'gönder': 'SEND',
          'metni temizle': 'CLEAR',
          'temizle': 'CLEAR',
          'sil': 'CLEAR',
          'yeni sohbet': 'NEW_CHAT',
          'yeni konuşma': 'NEW_CHAT',
          'baştan başla': 'NEW_CHAT',
          'model değiştir': 'SWITCH_MODEL',
          'konuşmayı durdur': 'STOP',
          'tekrarla': 'REPEAT'
        },
        contextPrompts: {
          systemPrefix: 'Sen yardımcı bir AI asistanısın.',
          memoryContext: 'Önceki Konuşmalardan Sesli Sohbet Bağlamı:',
          voiceChatNote: 'Not: Kullanıcı sesli sohbet üzerinden konuşuyor - doğal, konuşma tarzında yanıtlar ver.',
          processingStatus: 'Hafıza ile işleniyor...'
        },
        ttsVoicePreference: ['nova', 'echo', 'alloy']
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        voiceCommands: {
          '发送消息': 'SEND',
          '发送': 'SEND',
          '清除文本': 'CLEAR',
          '清除': 'CLEAR',
          '删除': 'CLEAR',
          '新聊天': 'NEW_CHAT',
          '新对话': 'NEW_CHAT',
          '重新开始': 'NEW_CHAT',
          '切换模型': 'SWITCH_MODEL',
          '停止说话': 'STOP',
          '重复一遍': 'REPEAT'
        },
        contextPrompts: {
          systemPrefix: '你是一个有用的AI助手。',
          memoryContext: '来自以前对话的语音聊天上下文：',
          voiceChatNote: '注意：用户通过语音聊天说话 - 提供自然的对话式回应。',
          processingStatus: '正在使用记忆处理...'
        },
        ttsVoicePreference: ['alloy', 'nova', 'echo']
      },
      {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        voiceCommands: {
          'отправить сообщение': 'SEND',
          'отправить': 'SEND',
          'очистить текст': 'CLEAR',
          'очистить': 'CLEAR',
          'удалить': 'CLEAR',
          'новый чат': 'NEW_CHAT',
          'новый разговор': 'NEW_CHAT',
          'начать заново': 'NEW_CHAT',
          'сменить модель': 'SWITCH_MODEL',
          'прекратить говорить': 'STOP',
          'повторить это': 'REPEAT'
        },
        contextPrompts: {
          systemPrefix: 'Вы полезный ИИ-ассистент.',
          memoryContext: 'Контекст голосового чата из предыдущих разговоров:',
          voiceChatNote: 'Примечание: Пользователь говорит через голосовой чат - предоставляйте естественные, разговорные ответы.',
          processingStatus: 'Обработка с памятью...'
        },
        ttsVoicePreference: ['onyx', 'echo', 'alloy']
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        voiceCommands: {
          'إرسال الرسالة': 'SEND',
          'إرسال': 'SEND',
          'مسح النص': 'CLEAR',
          'مسح': 'CLEAR',
          'حذف': 'CLEAR',
          'محادثة جديدة': 'NEW_CHAT',
          'محادثة جديدة': 'NEW_CHAT',
          'البدء من جديد': 'NEW_CHAT',
          'تغيير النموذج': 'SWITCH_MODEL',
          'توقف عن الكلام': 'STOP',
          'كرر ذلك': 'REPEAT'
        },
        contextPrompts: {
          systemPrefix: 'أنت مساعد ذكي مفيد.',
          memoryContext: 'سياق الدردشة الصوتية من المحادثات السابقة:',
          voiceChatNote: 'ملاحظة: المستخدم يتحدث عبر الدردشة الصوتية - قدم ردودًا طبيعية ومحادثة.',
          processingStatus: 'المعالجة مع الذاكرة...'
        },
        ttsVoicePreference: ['shimmer', 'nova', 'alloy']
      }
    ];

    configs.forEach(config => {
      this.languages.set(config.code, config);
    });
  }

  // LANGUAGE DETECTION
  detectLanguageFromText(text: string): SupportedLanguage {
    // Simple heuristic detection - in production, use a proper language detection library
    const patterns: Record<SupportedLanguage, RegExp[]> = {
      es: [/\b(el|la|de|en|que|y|es|un|una|con|no|se|te)\b/gi],
      fr: [/\b(le|la|de|et|est|à|il|être|et|en|avoir|que)\b/gi],
      de: [/\b(der|die|das|und|ist|zu|den|mit|nicht|ein)\b/gi],
      ja: [/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/],
      zh: [/[\u4E00-\u9FFF]/],
      ru: [/[\u0400-\u04FF]/],
      ar: [/[\u0600-\u06FF]/],
      tr: [/\b(bir|bu|ve|için|ile|olan|var|yok|gibi)\b/gi],
      en: [/\b(the|and|of|to|a|in|is|it|you|that)\b/gi]
    } as any;

    // Count matches for each language
    const scores: Record<SupportedLanguage, number> = {} as any;
    
    for (const [lang, regexes] of Object.entries(patterns)) {
      scores[lang as SupportedLanguage] = 0;
      regexes.forEach(regex => {
        const matches = text.match(regex);
        scores[lang as SupportedLanguage] += matches ? matches.length : 0;
      });
    }

    // Return language with highest score, default to English
    const bestMatch = Object.entries(scores).reduce((a, b) => 
      scores[a[0] as SupportedLanguage] > scores[b[0] as SupportedLanguage] ? a : b
    )[0] as SupportedLanguage;

    return scores[bestMatch] > 0 ? bestMatch : 'en';
  }

  // VOICE COMMAND DETECTION
  detectVoiceCommand(text: string, language?: SupportedLanguage): VoiceCommand | null {
    const detectedLang = language || this.detectLanguageFromText(text);
    const config = this.languages.get(detectedLang);
    
    if (!config) return null;

    const lowercaseText = text.toLowerCase().trim();
    
    for (const [phrase, action] of Object.entries(config.voiceCommands)) {
      if (lowercaseText.includes(phrase.toLowerCase())) {
        return {
          command: phrase,
          action: action as any
        };
      }
    }

    return null;
  }

  // CONTEXT FORMATTING
  formatVoiceChatContext(
    memories: string,
    language: SupportedLanguage,
    userMessage: string
  ): string {
    const config = this.languages.get(language) || this.languages.get('en')!;
    
    return `# ${config.contextPrompts.memoryContext}\n${memories}\n\n*${config.contextPrompts.voiceChatNote}*\n\n**${config.contextPrompts.systemPrefix}**`;
  }

  // TTS VOICE SELECTION
  getOptimalTTSVoice(language: SupportedLanguage): string {
    const config = this.languages.get(language) || this.languages.get('en')!;
    return config.ttsVoicePreference[0];
  }

  // USER PREFERENCES
  setUserLanguagePreference(userId: string, language: SupportedLanguage): void {
    this.userLanguagePreferences.set(userId, language);
    this.saveUserPreferences();
  }

  getUserLanguagePreference(userId: string): SupportedLanguage {
    return this.userLanguagePreferences.get(userId) || 'en';
  }

  // LANGUAGE STATUS
  getStatusText(status: string, language: SupportedLanguage): string {
    const config = this.languages.get(language) || this.languages.get('en')!;
    
    switch (status) {
      case 'processing':
        return config.contextPrompts.processingStatus;
      case 'listening':
        return language === 'en' ? 'Listening...' :
               language === 'es' ? 'Escuchando...' :
               language === 'fr' ? 'À l\'écoute...' :
               language === 'de' ? 'Hört zu...' :
               language === 'ja' ? '聞いています...' :
               language === 'tr' ? 'Dinliyor...' :
               language === 'zh' ? '正在听...' :
               language === 'ru' ? 'Слушаю...' :
               language === 'ar' ? 'أستمع...' :
               'Listening...';
      case 'speaking':
        return language === 'en' ? 'Speaking...' :
               language === 'es' ? 'Hablando...' :
               language === 'fr' ? 'Parle...' :
               language === 'de' ? 'Spreche...' :
               language === 'ja' ? '話しています...' :
               language === 'tr' ? 'Konuşuyor...' :
               language === 'zh' ? '正在说话...' :
               language === 'ru' ? 'Говорю...' :
               language === 'ar' ? 'أتحدث...' :
               'Speaking...';
      default:
        return status;
    }
  }

  getSupportedLanguages(): LanguageConfig[] {
    return Array.from(this.languages.values());
  }

  // PERSISTENCE
  private loadUserPreferences(): void {
    try {
      const stored = localStorage.getItem('user_language_preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        Object.entries(preferences).forEach(([userId, lang]) => {
          this.userLanguagePreferences.set(userId, lang as SupportedLanguage);
        });
      }
    } catch (error) {
      console.warn('Failed to load language preferences:', error);
    }
  }

  private saveUserPreferences(): void {
    try {
      const preferences = Object.fromEntries(this.userLanguagePreferences);
      localStorage.setItem('user_language_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save language preferences:', error);
    }
  }
}

// Singleton instance
let languageManager: MultiLanguageManager | null = null;

export function getLanguageManager(): MultiLanguageManager {
  if (!languageManager) {
    languageManager = new MultiLanguageManager();
  }
  return languageManager;
}

export default MultiLanguageManager;