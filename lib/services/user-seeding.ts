import { createClient } from '@/lib/supabase/client';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'lib-services-user-seeding' });


export interface SeedUserResponse {
  message: string;
  categories?: number;
  wardrobe_items?: number;
  skipped?: boolean;
}

export async function seedNewUser(): Promise<SeedUserResponse> {
  const supabase = createClient();
  
  // Get the current session to ensure user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('User must be authenticated to seed data');
  }

  // Call the seed-user edge function
  const { data, error } = await supabase.functions.invoke('seed-user', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    logger.error('Seed user error:', error);
    throw new Error(`Failed to seed user data: ${error.message}`);
  }

  return data as SeedUserResponse;
}