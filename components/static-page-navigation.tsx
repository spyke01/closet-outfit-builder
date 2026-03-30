'use client';

import Link from "next/link";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { SimpleThemeToggle } from "@/components/simple-theme-toggle";
import { Logo } from "@/components/logo";
import { Menu, X } from 'lucide-react';


import { useState } from "react";

export function StaticPageNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navGlassStyle: CSSProperties = {
    backdropFilter: 'blur(32px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
  };

  return (
    <nav className="glass-nav fixed left-0 right-0 top-0 z-50" style={navGlassStyle}>
      <div className="mx-auto max-w-[1240px] px-6 py-2">
        <div className="flex min-h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo className="h-12 w-auto" />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/how-it-works" className="rounded-[var(--radius-pill)] px-3 py-2 text-muted-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-surface)] hover:text-foreground">
              How it works
            </Link>
            <Link href="/sebastian" className="rounded-[var(--radius-pill)] px-3 py-2 text-muted-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-surface)] hover:text-foreground">
              Sebastian
            </Link>
            <Link href="/pricing" className="rounded-[var(--radius-pill)] px-3 py-2 text-muted-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-surface)] hover:text-foreground">
              Pricing
            </Link>
            <Link href="/about" className="rounded-[var(--radius-pill)] px-3 py-2 text-muted-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-surface)] hover:text-foreground">
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
              <Button>
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
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="space-y-4 border-t border-[var(--nav-border)] py-4 md:hidden">
            <Link 
              href="/how-it-works" 
              className="block rounded-[var(--radius-pill)] px-3 py-2 text-muted-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-surface)] hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              How it works
            </Link>
            <Link 
              href="/sebastian" 
              className="block rounded-[var(--radius-pill)] px-3 py-2 text-muted-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-surface)] hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Sebastian
            </Link>
            <Link 
              href="/pricing" 
              className="block rounded-[var(--radius-pill)] px-3 py-2 text-muted-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-surface)] hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              href="/about" 
              className="block rounded-[var(--radius-pill)] px-3 py-2 text-muted-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-surface)] hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <div className="flex flex-col gap-2 border-t border-[var(--nav-border)] pt-4">
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/sign-up" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full">
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
