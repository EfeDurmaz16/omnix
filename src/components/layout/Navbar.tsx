'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Moon,
  Sun,
  Menu,
  Zap,
} from 'lucide-react';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { usageStats } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const formatCredits = (credits: number) => {
    return credits?.toLocaleString() || '0';
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Docs', href: '/docs' },
  ];

  const userNavigation = [
    { name: 'Profile', href: '/profile' },
    { name: 'Settings', href: '/settings' },
    { name: 'Usage', href: '/usage' },
    { name: 'Billing', href: '/billing' },
  ];

  return (
    <nav className="fixed top-0 z-50 w-full">
      <div className="glass-morphism border-b border-slate-500/10">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Left Section - Logo + Navigation */}
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group mr-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 dark:from-slate-600 dark:to-slate-700 rounded-xl blur-sm glow-slate group-hover:blur-md transition-all duration-300"></div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 dark:from-slate-600 dark:to-slate-700 shadow-lg">
                  <Zap className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
              </div>
              <span className="hidden text-lg font-medium text-foreground tracking-wide sm:inline-block group-hover:text-muted-foreground transition-colors duration-300">
                Omnix
              </span>
            </Link>

            {/* Desktop Navigation - Enhanced with border */}
            <div className="hidden md:flex">
              <div className="glass-morphism-light rounded-xl px-6 py-2 border border-border">
                <nav className="flex items-center space-x-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 group py-2"
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
              {usageStats && (
                <div className="relative hidden sm:inline-flex">
                  <Badge className="glass-morphism-light border-border text-foreground font-medium glow-slate px-3 py-1">
                    <Zap className="w-3 h-3 mr-1.5" />
                    {formatCredits(usageStats.remainingCredits)}
                  </Badge>
                </div>
              )}
            </SignedIn>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="glass-morphism-light hover:bg-accent rounded-lg w-9 h-9 glow-accent"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Authentication - Signed In */}
            <SignedIn>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-600/20 to-slate-700/20 rounded-lg blur-sm"></div>
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8 ring-2 ring-slate-400/30 shadow-lg"
                    }
                  }}
                />
              </div>
            </SignedIn>

            {/* Authentication - Signed Out */}
            <SignedOut>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild className="glass-hover text-foreground font-medium px-4 py-2 h-9">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="glass-button bg-gradient-to-br from-primary to-purple-600 hover:from-blue-500 hover:to-purple-500 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-500 dark:hover:to-slate-600 text-white glow-slate px-4 py-2 h-9">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            </SignedOut>

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="glass-morphism-light hover:bg-slate-400/10 rounded-lg w-9 h-9 md:hidden text-white"
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="glass-morphism-heavy border-slate-500/20 backdrop-blur-3xl w-72 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  {/* Mobile Logo */}
                  <div className="p-6 border-b border-slate-500/10">
                    <Link
                      href="/"
                      className="flex items-center space-x-3 group"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl blur-sm glow-slate"></div>
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 shadow-lg">
                          <Zap className="h-4 w-4 text-white" strokeWidth={2} />
                        </div>
                      </div>
                      <span className="text-lg font-medium text-white tracking-wide">Omnix</span>
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
                          className="text-slate-300 hover:text-white transition-colors duration-300 py-3 px-4 rounded-lg hover:bg-slate-400/10 font-medium"
                        >
                          {item.name}
                        </Link>
                      ))}
                      
                      {/* User Navigation - Mobile Only */}
                      <SignedIn>
                        <div className="border-t border-slate-500/20 pt-4 mt-4">
                          <div className="text-sm font-medium text-white mb-3 px-4">Account</div>
                          {userNavigation.map((item) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="text-slate-300 hover:text-white transition-colors duration-300 block py-3 px-4 rounded-lg hover:bg-slate-400/10 font-medium"
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
      </div>
    </nav>
  );
} 