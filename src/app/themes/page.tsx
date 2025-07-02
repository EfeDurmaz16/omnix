'use client';

import { useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Waves, 
  CloudRain, 
  Mountain, 
  Crown,
  Palette,
  Eye,
  Sparkles,
  MessageSquare,
  Image,
  Video,
  Heart,
  Star,
  Zap,
  Brain
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ThemesPage() {
  const { theme, setTheme, availableThemes } = useTheme();
  const [previewTheme, setPreviewTheme] = useState(theme);

  const getThemeIcon = (themeId: string) => {
    switch (themeId) {
      case 'aegean': return <Waves className="h-6 w-6" />;
      case 'karadeniz': return <CloudRain className="h-6 w-6" />;
      case 'gobeklitepe': return <Mountain className="h-6 w-6" />;
      case 'ani': return <Crown className="h-6 w-6" />;
      default: return <Palette className="h-6 w-6" />;
    }
  };

  

  const getThemeDescription = (themeId: string) => {
    switch (themeId) {
      case 'aegean':
        return {
          inspiration: "Inspired by the crystal-clear waters of the Aegean Sea and ancient Mediterranean civilizations.",
          colors: ["Deep Aegean Blue #004A7C", "Terracotta #CC5500", "Olive Green #708238", "Marble White #FAFAFA"],
          mood: "Warm, inviting, classical",
          heritage: "Ancient Greek & Roman coastal cities",
          keyColors: ["#004A7C", "#CC5500", "#708238", "#FAFAFA"]
        };
      case 'karadeniz':
        return {
          inspiration: "Drawn from the mysterious depths of the Black Sea and the lush forests of northern Turkey.",
          colors: ["Black Sea Deep #0A1628", "Forest Moss #2F5F2F", "Hazelnut #8B6B47", "Snow Peak #F8F8FF"],
          mood: "Mysterious, powerful, natural",
          heritage: "Pontic & Caucasian mountain cultures",
          keyColors: ["#0A1628", "#2F5F2F", "#8B6B47", "#F8F8FF"]
        };
      case 'gobeklitepe':
        return {
          inspiration: "Based on the world's oldest temple complex and ancient Anatolian mysticism.",
          colors: ["Limestone #E8DCC6", "Temple Gold #D4A574", "Sacred Ochre #CC7722", "Cosmic Purple #4B0082"],
          mood: "Mystical, ancient, powerful",
          heritage: "Neolithic temple builders (9500 BCE)",
          keyColors: ["#E8DCC6", "#D4A574", "#CC7722", "#4B0082"]
        };
      case 'ani':
        return {
          inspiration: "Merged Anatolian heritage combining sanddust landscapes with muted crimson and ancient wisdom.",
          colors: ["Muted Crimson #8B2635", "Ancient Ochre #CC7722", "Copper #B87333", "Sanddust #D2B48C"],
          mood: "Earthy, sophisticated, readable",
          heritage: "Combined Göbekli Tepe mysticism & Silk Road heritage",
          keyColors: ["#8B2635", "#CC7722", "#B87333", "#D2B48C"]
        };
      default:
        return {
          inspiration: "Default theme",
          colors: [],
          mood: "Neutral",
          heritage: "",
          keyColors: []
        };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center space-x-2">
              <Palette className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Aspendos Themes</span>
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Cultural Showcase
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text ">
            🏛️ Cultural Themes
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Immerse yourself in the rich cultural heritage of Anatolia and the Mediterranean through carefully crafted color palettes inspired by historical sites and ancient civilizations.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {availableThemes.map((themeItem) => (
              <Button
                key={themeItem.id}
                variant={theme === themeItem.id ? "default" : "outline"}
                size="lg"
                onClick={() => setTheme(themeItem.id)}
                className="gap-2 hover:scale-105 transition-transform"
              >
                <themeItem.icon className="w-5 h-5" />
                {themeItem.name}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Current Theme Highlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-12"
        >
          <Card className="glass-morphism ancient-glow overflow-hidden cultural-card">
            <div className={`h-40 cultural-gradient-bg ${theme} relative`}>
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    {getThemeIcon(theme)}
                    <h2 className="text-3xl font-bold">
                      {availableThemes.find(t => t.id === theme)?.name}
                    </h2>
                  </div>
                  <p className="text-lg opacity-90">Currently Active Theme</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Heritage</h3>
                  <p className="text-sm text-muted-foreground">
                    {getThemeDescription(theme).heritage}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Color Palette</h3>
                  <div className="flex gap-2">
                    {getThemeDescription(theme).keyColors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Theme Showcase Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {availableThemes.map((themeItem, index) => {
            const themeDetails = getThemeDescription(themeItem.id);
            return (
              <motion.div
                key={themeItem.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 cultural-card ${
                  theme === themeItem.id ? 'ring-2 ring-primary shadow-lg' : ''
                }`}>
                  <div className={`h-32 cultural-gradient-bg ${themeItem.id} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <div className="flex items-center gap-2 mb-2">
                        {getThemeIcon(themeItem.id)}
                        <h3 className="text-xl font-bold">{themeItem.name}</h3>
                      </div>
                      <p className="text-sm opacity-90">{themeItem.description}</p>
                    </div>
                    {theme === themeItem.id && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-white/20 text-white border-white/30 animate-pulse">
                          ✨ Active
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      {themeDetails.inspiration}
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Color Palette</h4>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          {themeDetails.colors.map((color, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: themeDetails.keyColors[idx] }}
                              />
                              <span className="truncate text-muted-foreground">{color}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <Badge variant="outline" className="text-xs">
                          {themeDetails.mood}
                        </Badge>
                        <Button
                          size="sm"
                          variant={theme === themeItem.id ? "default" : "outline"}
                          onClick={() => setTheme(themeItem.id)}
                          className="hover:scale-105 transition-transform"
                        >
                          {theme === themeItem.id ? '✓ Active' : 'Apply Theme'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Interactive Demo Section */}
        <Card className="p-8 glass-morphism cultural-card">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Eye className="h-6 w-6" />
              Interactive Demo
            </CardTitle>
            <CardDescription>
              See how the current theme affects different UI components in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="components" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="chat">Chat Interface</TabsTrigger>
                <TabsTrigger value="animations">Animations</TabsTrigger>
              </TabsList>

              <TabsContent value="components" className="mt-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Buttons */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Buttons & Actions</h3>
                    <div className="space-y-2">
                      <Button className="w-full">Primary Button</Button>
                      <Button variant="outline" className="w-full">Outline Button</Button>
                      <Button variant="secondary" className="w-full">Secondary</Button>
                      <Button variant="destructive" className="w-full">Destructive</Button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Badges & Pills</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge>Default</Badge>
                      <Badge variant="secondary">Secondary</Badge>
                      <Badge variant="outline">Outline</Badge>
                      <Badge variant="destructive">Error</Badge>
                    </div>
                  </div>

                  {/* Icons */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Icon Colors</h3>
                    <div className="flex gap-4">
                      <Heart className="h-6 w-6 text-primary hover:scale-110 transition-transform cursor-pointer" />
                      <Star className="h-6 w-6 text-accent hover:scale-110 transition-transform cursor-pointer" />
                      <Sparkles className="h-6 w-6 text-muted-foreground hover:scale-110 transition-transform cursor-pointer" />
                      <Eye className="h-6 w-6 text-secondary hover:scale-110 transition-transform cursor-pointer" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chat" className="mt-6">
                <div className="space-y-4">
                  <div className="glass-morphism rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">AI Assistant</div>
                        <div className="text-sm text-muted-foreground">
                          Using {availableThemes.find(t => t.id === theme)?.name} theme
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-muted rounded-lg p-3 text-sm">
                        This is how a chat message would look in the current theme. Notice how the colors adapt to create the perfect cultural atmosphere.
                      </div>
                      
                      {/* Thinking Mode Buttons Demo */}
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" className="thinking-mode-flash active text-white">
                          <Zap className="h-3 w-3 mr-1" />
                          Flash
                        </Button>
                        <Button size="sm" className="thinking-mode-think text-white">
                          <Brain className="h-3 w-3 mr-1" />
                          Think
                        </Button>
                        <Button size="sm" className="thinking-mode-ultra-think text-white">
                          <Sparkles className="h-3 w-3 mr-1" />
                          UltraThink
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="animations" className="mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="glass-morphism ancient-glow cosmic-float">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Ancient Animations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Theme-specific animations like ancient glow and cosmic float effects.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="glass-morphism spice-glow caravan-march">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5" />
                        Cultural Effects
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Silk shimmer, caravan march, and other heritage-inspired animations.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Usage Guide */}
        <Card className="mt-12 p-6 cultural-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              How to Use These Themes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">🎨 In Your Projects</h3>
                <p className="text-sm text-muted-foreground">
                  These themes are designed to be reusable. Copy the CSS variables and color palettes to bring cultural authenticity to your own applications.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🏛️ Cultural Context</h3>
                <p className="text-sm text-muted-foreground">
                  Each theme tells a story of ancient civilizations, from the mystical temples of Göbekli Tepe to the vibrant Silk Road trade routes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-muted-foreground space-y-2">
          <p className="text-lg">🌍 Themes inspired by the rich cultural heritage of Anatolia and the Mediterranean</p>
          <p className="text-sm">✨ Perfect for reuse in your upcoming projects</p>
          <p className="text-xs">🏛️ Honoring ancient civilizations through modern design</p>
        </div>
      </div>
    </div>
  );
}
