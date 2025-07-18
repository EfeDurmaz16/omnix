'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/providers/ThemeProvider';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Menu,
  Zap,
} from 'lucide-react';

export function Navbar() {
  const { theme } = useTheme();
  const { usageStats, refreshUsageStats } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Debug logging
  console.log('🔍 Navbar - usageStats:', usageStats);

  const formatCredits = (credits: number) => {
    return credits?.toLocaleString() || '0';
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Sandbox', href: '/sandbox' },
    { name: 'Billing', href: '/billing' },
    { name: 'Themes', href: '/themes' },
    { name: 'Profile', href: '/profile' },
    { name: 'Settings', href: '/settings' },
    { name: 'Usage', href: '/usage' },
  ];

  const userNavigation = [
    { name: 'Profile', href: '/profile' },
    { name: 'Settings', href: '/settings' },
    { name: 'Usage', href: '/usage' },
  ];

  return (
    // show only while scrolling
    
    <nav className="sticky top-0 z-50 w-full cultural-card backdrop-blur-sm border-b cultural-border">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left Section - Logo + Navigation */}
        <div className="flex items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group mr-8">
            <div className="relative">
              <img src="/aspendos-icon.svg" alt="Aspendos" className="w-8 h-8" />
            </div>
            <span className="hidden text-lg font-medium cultural-text-primary tracking-wide sm:inline-block group-hover:text-muted-foreground transition-colors duration-300">
              Aspendos
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex">
            <div className="cultural-card rounded-xl px-6 py-2 cultural-border">
              <nav className="flex items-center space-x-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="relative text-sm font-medium cultural-text-primary hover:text-foreground transition-all duration-300 group py-2 cultural-hover"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent-foreground group-hover:w-full transition-all duration-300"></span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Credits Badge */}
          <SignedIn>
            <div className="relative hidden sm:inline-flex">
              <Badge 
                className="cultural-accent cultural-border text-foreground font-medium px-3 py-1 cursor-pointer"
                onClick={() => refreshUsageStats()}
                title="Click to refresh credits"
              >
                <Zap className="w-3 h-3 mr-1.5" />
                {formatCredits(usageStats?.remainingCredits || 0)}
              </Badge>
            </div>
          </SignedIn>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Authentication - Signed In */}
          <SignedIn>
            <div className="relative">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8 ring-2 ring-border shadow-lg"
                  }
                }}
              />
            </div>
          </SignedIn>

          {/* Authentication - Signed Out */}
          <SignedOut>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild className="cultural-hover text-foreground font-medium px-4 py-2 h-9">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild className="cultural-primary cultural-hover text-white px-4 py-2 h-9">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </SignedOut>

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="cultural-hover rounded-lg w-9 h-9 md:hidden"
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="cultural-card cultural-border backdrop-blur-3xl w-72 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col h-full">
                {/* Mobile Logo */}
                <div className="p-6 border-b cultural-border">
                  <Link
                    href="/"
                    className="flex items-center space-x-3 group"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="relative">
                      <img src="/aspendos-icon.svg" alt="Aspendos" className="w-8 h-8" />
                    </div>
                    <span className="text-lg font-medium cultural-text-primary tracking-wide">Aspendos</span>
                  </Link>
                </div>

                {/* Mobile Navigation */}
                <div className="flex-1 px-6 py-4">
                  <div className="flex flex-col space-y-2">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="cultural-text-primary hover:text-foreground transition-colors duration-300 py-3 px-4 rounded-lg cultural-hover font-medium"
                      >
                        {item.name}
                      </Link>
                    ))}
                    
                    {/* User Navigation - Mobile Only */}
                    <SignedIn>
                      <div className="border-t cultural-border pt-4 mt-4">
                        <div className="text-sm font-medium cultural-text-primary mb-3 px-4">Account</div>
                        {userNavigation.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="cultural-text-primary hover:text-foreground transition-colors duration-300 block py-3 px-4 rounded-lg cultural-hover font-medium"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </SignedIn>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
} 