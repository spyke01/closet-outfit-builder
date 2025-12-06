import { NextResponse } from 'next/server';

export async function GET() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ];

  const envStatus = requiredVars.reduce((acc, varName) => {
    const value = process.env[varName];
    acc[varName] = {
      isSet: !!value,
      // Show partial value for verification (safe for public vars)
      partial: value ? `${value.substring(0, 20)}...${value.substring(value.length - 10)}` : null,
    };
    return acc;
  }, {} as Record<string, { isSet: boolean; partial: string | null }>);

  const allSet = Object.values(envStatus).every(status => status.isSet);

  return NextResponse.json({
    status: allSet ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    netlify: process.env.NETLIFY === 'true',
    variables: envStatus,
  });
}