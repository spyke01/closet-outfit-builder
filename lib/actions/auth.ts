'use server'

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Authentication utilities for Server Actions
 * All Server Actions should use these utilities to ensure proper authentication
 */

export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
}

/**
 * Verify user session and return authenticated user
 * Throws error if not authenticated
 */
export async function verifySession(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Unauthorized: Authentication required');
  }
  
  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Verify user owns a resource
 * Throws error if user doesn't own the resource
 */
export async function verifyOwnership(userId: string, resourceUserId: string): Promise<void> {
  if (userId !== resourceUserId) {
    throw new Error('Forbidden: You do not have permission to access this resource');
  }
}

/**
 * Create authenticated Supabase client
 * Returns both client and authenticated user
 */
export async function createAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Unauthorized: Authentication required');
  }
  
  return {
    supabase,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}
