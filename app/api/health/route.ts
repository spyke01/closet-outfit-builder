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
    diagnostics: process.env.NODE_ENV === 'production' ? undefined : {},
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
      healthCheck.checks.environment = 'unhealthy';
      healthCheck.status = 'unhealthy';
      if (healthCheck.diagnostics) {
        healthCheck.diagnostics = {
          ...(healthCheck.diagnostics as Record<string, unknown>),
          missingEnvironmentCount: missingEnvVars.length,
        };
      }
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
          healthCheck.checks.database = 'degraded';
          healthCheck.status = 'degraded';
          if (healthCheck.diagnostics) {
            healthCheck.diagnostics = {
              ...(healthCheck.diagnostics as Record<string, unknown>),
              databaseError: true,
            };
          }
        } else {
          healthCheck.checks.database = 'ok';
        }
      } catch {
        healthCheck.checks.database = 'unhealthy';
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
      checks: {
        database: 'unhealthy',
        environment: 'unknown',
      },
      diagnostics: process.env.NODE_ENV === 'production'
        ? undefined
        : { failure: error instanceof Error ? error.message : 'Unknown error' },
    }, { status: 503 });
  }
}
