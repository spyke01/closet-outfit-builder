/**
 * Health check endpoint for deployment verification
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-static';

export async function GET() {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      environment: 'unknown',
    },
  };

  try {
    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      healthCheck.checks.environment = `missing: ${missingEnvVars.join(', ')}`;
      healthCheck.status = 'unhealthy';
    } else {
      healthCheck.checks.environment = 'ok';
    }

    // Check Supabase connection
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        );

        // Simple query to test connection
        const { error } = await supabase.from('categories').select('count').limit(1);
        
        if (error) {
          healthCheck.checks.database = `error: ${error.message}`;
          healthCheck.status = 'degraded';
        } else {
          healthCheck.checks.database = 'ok';
        }
      } catch (error) {
        healthCheck.checks.database = `connection failed: ${error instanceof Error ? error.message : 'unknown error'}`;
        healthCheck.status = 'unhealthy';
      }
    }

    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}