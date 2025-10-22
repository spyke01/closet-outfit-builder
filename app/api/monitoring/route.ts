/**
 * Monitoring API endpoint for collecting errors and performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schemas
const ErrorReportSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  url: z.string().url(),
  userAgent: z.string(),
  timestamp: z.string(),
  userId: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
});

const PerformanceMetricsSchema = z.object({
  pageLoadTime: z.number().optional(),
  firstContentfulPaint: z.number().optional(),
  largestContentfulPaint: z.number().optional(),
  cumulativeLayoutShift: z.number().optional(),
  firstInputDelay: z.number().optional(),
  url: z.string().url(),
  timestamp: z.string(),
});

const UserEventSchema = z.object({
  name: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
  url: z.string().url(),
  timestamp: z.string(),
});

const ApiCallSchema = z.object({
  endpoint: z.string(),
  method: z.string(),
  duration: z.number(),
  status: z.number(),
  timestamp: z.string(),
});

const MetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  url: z.string().url(),
  timestamp: z.string(),
});

const MonitoringRequestSchema = z.object({
  type: z.enum(['error', 'performance', 'event', 'api', 'metric']),
  data: z.any(),
});

// Rate limiting (simple in-memory store for demo)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = ip;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (current.count >= RATE_LIMIT) {
    return false;
  }

  current.count++;
  return true;
}

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const { type, data } = MonitoringRequestSchema.parse(body);

    // Validate data based on type
    let validatedData;
    switch (type) {
      case 'error':
        validatedData = ErrorReportSchema.parse(data);
        break;
      case 'performance':
        validatedData = PerformanceMetricsSchema.parse(data);
        break;
      case 'event':
        validatedData = UserEventSchema.parse(data);
        break;
      case 'api':
        validatedData = ApiCallSchema.parse(data);
        break;
      case 'metric':
        validatedData = MetricSchema.parse(data);
        break;
      default:
        throw new Error('Invalid monitoring type');
    }

    // In production, you would send this to your monitoring service
    // For now, we'll log to console and could extend to send to services like:
    // - Sentry for error tracking
    // - DataDog for performance monitoring
    // - Google Analytics for user events
    // - Custom logging service

    if (process.env.NODE_ENV === 'production') {
      // Log structured data for production monitoring
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        type,
        data: validatedData,
        ip,
        userAgent: request.headers.get('user-agent'),
      }));

      // Example: Send to external monitoring service
      // await sendToMonitoringService(type, validatedData);
    } else {
      // Development logging
      console.log(`[MONITORING] ${type}:`, validatedData);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Monitoring endpoint error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
}

// Example function to send to external monitoring services
async function sendToMonitoringService(type: string, data: any) {
  // Example: Send errors to Sentry
  if (type === 'error' && process.env.SENTRY_DSN) {
    // Sentry.captureException(new Error(data.message), { extra: data });
  }

  // Example: Send performance metrics to DataDog
  if (type === 'performance' && process.env.DATADOG_API_KEY) {
    // await datadogClient.increment('app.performance.page_load', 1, {
    //   url: data.url,
    //   load_time: data.pageLoadTime,
    // });
  }

  // Example: Send user events to Google Analytics
  if (type === 'event' && process.env.GOOGLE_ANALYTICS_ID) {
    // await gtag('event', data.name, data.properties);
  }
}