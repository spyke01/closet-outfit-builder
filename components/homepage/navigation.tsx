'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SimpleThemeToggle } from "@/components/simple-theme-toggle";
import { Logo } from "@/components/logo";
import { Menu, X } from 'lucide-react';


import { useState } from "react";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo className="h-12 w-auto" />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-[#D49E7C] text-[#1A2830] hover:bg-[#e1b08f] rounded-xl">
                Get Started
              </Button>
            </Link>
            <SimpleThemeToggle />
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <SimpleThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-muted-foreground"
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-4">
              <Link 
              href="#how-it-works" 
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              How it works
            </Link>
            <Link 
              href="/pricing" 
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              href="/about" 
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/sign-up" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full bg-[#D49E7C] text-[#1A2830] hover:bg-[#e1b08f]">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
