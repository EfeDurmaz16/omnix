"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Menu, 
  ChevronDown, 
  Settings, 
  Share, 
  Download,
  MoreVertical,
  Zap,
  Crown,
  Star,
  Brain,
  Sparkles,
  Mic
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImportExportButton } from '@/components/import-export/ImportExportButton';
import { Switch } from '@/components/ui/switch';

interface ChatHeaderProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  onToggleSidebar: () => void;
  onShowModelSearch: () => void;
  showModelSearch: boolean;
  conversationTitle: string;
  thinkingMode?: string;
  onThinkingModeChange?: (mode: string) => void;
  userId?: string;
  autoRoutingEnabled?: boolean;
  onAutoRoutingToggle?: (enabled: boolean) => void;
  showVoiceChat?: boolean;
  onVoiceChatToggle?: (enabled: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
}

// Custom icon component for brain explosion emoji
const BrainBombed = ({ className }: { className?: string }) => (
  <span className={`${className || 'text-sm'} flex items-center justify-center leading-none`}>🤯</span>
);

const thinkingModes = [
  { id: 'flash', name: 'Flash', icon: Zap, color: 'from-yellow-400 to-orange-500' },
  { id: 'think', name: 'Think', icon: Brain, color: 'from-blue-400 to-purple-500' },
  { id: 'ultra-think', name: 'UltraThink', icon: Sparkles, color: 'from-purple-400 to-pink-500' },
  { id: 'full-think', name: 'FullThink', icon: BrainBombed, color: 'from-red-400 to-orange-600' }
];

export function ChatHeader({
  selectedModel,
  onModelChange,
  onToggleSidebar,
  onShowModelSearch,
  showModelSearch,
  conversationTitle,
  thinkingMode,
  onThinkingModeChange,
  userId,
  autoRoutingEnabled = false,
  onAutoRoutingToggle,
  showVoiceChat = false,
  onVoiceChatToggle,
  webSearchEnabled = false,
  onWebSearchToggle
}: ChatHeaderProps) {
  const [showQuickModels, setShowQuickModels] = useState(false);

  const quickModels = [
    { id: 'gpt-4o', name: 'GPT-4o', icon: Star, tier: 'premium' },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5', icon: Zap, tier: 'standard' },
    { id: 'o3', name: 'o3', icon: Crown, tier: 'flagship', isNew: true },
    { id: 'gemini-pro', name: 'Gemini Pro', icon: Star, tier: 'standard' }
  ];

  const getModelInfo = (modelId: string) => {
    const modelMap: Record<string, { name: string; provider: string; tier: string; isNew?: boolean }> = {
      'gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', tier: 'premium' },
      'claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', tier: 'standard' },
      'o3': { name: 'o3', provider: 'OpenAI', tier: 'flagship', isNew: true },
      'gemini-pro': { name: 'Gemini Pro', provider: 'Google', tier: 'standard' }
    };
    return modelMap[modelId] || { name: modelId, provider: 'Unknown', tier: 'standard' };
  };

  const modelInfo = getModelInfo(selectedModel);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'flagship': return 'text-purple-600 bg-purple-100';
      case 'premium': return 'text-blue-600 bg-blue-100';
      case 'standard': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle - Always visible */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          title="Toggle chat history"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Conversation Title */}
        <div className="hidden md:block">
          <h1 className="font-semibold text-lg truncate max-w-xs">
            {conversationTitle}
          </h1>
        </div>
      </div>

      {/* Center Section - Model Selector */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Button
            variant="outline"
            onClick={onShowModelSearch}
            className="w-full justify-between h-10 px-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getTierColor(modelInfo.tier)}`} />
                <span className="font-medium truncate">{modelInfo.name}</span>
                {modelInfo.isNew && (
                  <Badge variant="secondary" className="text-xs py-0 px-1.5">
                    New
                  </Badge>
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>

          {/* Quick Model Switcher */}
          {showQuickModels && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-full bg-popover border border-border rounded-md shadow-lg z-50"
            >
              <div className="p-2">
                <div className="text-xs text-muted-foreground mb-2 px-2">Quick Switch</div>
                {quickModels.map((model) => {
                  const Icon = model.icon;
                  return (
                    <Button
                      key={model.id}
                      variant={selectedModel === model.id ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        onModelChange(model.id);
                        setShowQuickModels(false);
                      }}
                      className="w-full justify-start gap-2 mb-1"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{model.name}</span>
                      {model.isNew && (
                        <Badge variant="outline" className="text-xs">New</Badge>
                      )}
                    </Button>
                  );
                })}
                
                <div className="border-t border-border mt-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowQuickModels(false);
                      onShowModelSearch();
                    }}
                    className="w-full justify-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Browse All Models
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Model Details */}
        <div className="mt-1 text-xs text-muted-foreground text-center">
          {modelInfo.provider} • {modelInfo.tier}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Thinking Mode Selector - Always visible during chat */}
        {thinkingMode && onThinkingModeChange && (
          <div className="flex items-center gap-1 border border-border/50 rounded-md p-1">
            {thinkingModes.map((mode) => {
              const IconComponent = mode.icon;
              const isActive = thinkingMode === mode.id;
              return (
                <Button
                  key={mode.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onThinkingModeChange(mode.id)}
                  className={`thinking-mode-${mode.id} ${isActive ? 'active' : ''} px-2 py-1 h-7 min-w-[28px] transition-all duration-200 border-0 flex items-center justify-center ${
                    isActive 
                      ? 'text-white shadow-lg' 
                      : 'text-muted-foreground hover:shadow-md hover:bg-muted/50'
                  }`}
                  title={`${mode.name} mode`}
                >
                  <IconComponent className="h-3 w-3" />
                </Button>
              );
            })}
          </div>
        )}

        {/* Auto-Routing Toggle */}
        {onAutoRoutingToggle && (
          <div className="flex items-center gap-2 px-2 min-w-fit">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Smart</span>
            <Switch
              checked={autoRoutingEnabled}
              onCheckedChange={onAutoRoutingToggle}
              className="scale-90 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input border-border"
            />
          </div>
        )}

        {/* Voice Chat Toggle */}
        {onVoiceChatToggle && (
          <div className="flex items-center gap-2 px-2 min-w-fit">
            <Mic className={`h-4 w-4 ${showVoiceChat ? 'text-green-500' : 'text-muted-foreground'}`} />
            <Switch
              checked={showVoiceChat}
              onCheckedChange={onVoiceChatToggle}
              className="scale-90 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-input border-border"
            />
          </div>
        )}

        {/* Web Search Toggle */}
        {onWebSearchToggle && (
          <div className="flex items-center gap-2 px-2 min-w-fit">
            <span className={`text-sm ${webSearchEnabled ? 'text-blue-500' : 'text-muted-foreground'}`}>
              {webSearchEnabled ? '🌐' : '🔍'}
            </span>
            <Switch
              checked={webSearchEnabled}
              onCheckedChange={onWebSearchToggle}
              className="scale-90 data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-input border-border"
            />
          </div>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Action Buttons */}
        <Button variant="ghost" size="sm" className="hidden sm:flex">
          <Share className="h-4 w-4" />
        </Button>
        
        {/* Import/Export Button */}
        {userId && (
          <ImportExportButton 
            userId={userId} 
            variant="ghost" 
            size="sm" 
            className="hidden sm:flex"
          />
        )}

        {/* More Menu */}
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
} 