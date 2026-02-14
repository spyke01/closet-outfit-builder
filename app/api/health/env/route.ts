import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ];

  const envStatus = requiredVars.reduce((acc, varName) => {
    const value = process.env[varName];
    acc[varName] = { isSet: !!value };
    return acc;
  }, {} as Record<string, { isSet: boolean }>);

  const allSet = Object.values(envStatus).every(status => status.isSet);

  return NextResponse.json({
    status: allSet ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    variables: envStatus,
  });
}
