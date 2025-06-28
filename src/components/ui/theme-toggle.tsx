'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, availableThemes } = useTheme();

  const currentTheme = availableThemes.find(t => t.id === theme);
  const CurrentIcon = currentTheme?.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
          <span className="hidden sm:inline">{currentTheme?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableThemes.map((themeOption) => {
          const Icon = themeOption.icon;
          return (
            <DropdownMenuItem
              key={themeOption.id}
              onClick={() => setTheme(themeOption.id)}
              className="flex items-center space-x-2"
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{themeOption.name}</span>
                <span className="text-xs text-muted-foreground">{themeOption.description}</span>
              </div>
              {theme === themeOption.id && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 