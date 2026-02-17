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

// Best-effort in-memory limiter with bounded growth.
const rateLimitStore = new Map<string, { count: number; resetTime: number; lastSeen: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_RATE_LIMIT_KEYS = 10_000;

function getClientIdentifier(request: NextRequest): string {
  const trustedIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-real-ip');
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = trustedIp || forwardedIp || 'unknown';
  const userAgent = (request.headers.get('user-agent') || 'unknown').slice(0, 160);

  return `${ip}:${userAgent}`;
}

function pruneRateLimitStore(now: number): void {
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }

  if (rateLimitStore.size <= MAX_RATE_LIMIT_KEYS) {
    return;
  }

  const overflow = rateLimitStore.size - MAX_RATE_LIMIT_KEYS;
  const oldestEntries = [...rateLimitStore.entries()]
    .sort((a, b) => a[1].lastSeen - b[1].lastSeen)
    .slice(0, overflow);

  for (const [key] of oldestEntries) {
    rateLimitStore.delete(key);
  }
}

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  pruneRateLimitStore(now);
  const key = identifier;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW, lastSeen: now });
    return true;
  }

  if (current.count >= RATE_LIMIT) {
    current.lastSeen = now;
    return false;
  }

  current.count++;
  current.lastSeen = now;
  return true;
}

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - early return if exceeded
    const clientIdentifier = getClientIdentifier(request);
    if (!checkRateLimit(clientIdentifier)) {
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
    // - Sentry for error tracking (deferred loading)
    // - DataDog for performance monitoring (deferred loading)
    // - Google Analytics for user events (deferred loading)
    // - Custom logging service (deferred loading)

    if (process.env.NODE_ENV === 'production') {
      // Log structured data for production monitoring
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        type,
        data: validatedData,
        clientIdentifier,
        userAgent: request.headers.get('user-agent'),
      }));

      // Send to external monitoring services (deferred, non-blocking)
      sendToMonitoringService(type, validatedData).catch(() => {
        // Silently fail to avoid breaking the API
      });
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

// Example function to send to external monitoring services (deferred)
async function sendToMonitoringService(type: string, data: Record<string, unknown>) {
  // Only run in production to avoid unnecessary processing
  if (process.env.NODE_ENV !== 'production') return;

  try {
    // Example: Send errors to Sentry (deferred loading)
    if (type === 'error' && process.env.SENTRY_DSN) {
      // Dynamically import Sentry to avoid blocking initial load
      try {
        // Use Function constructor to avoid static analysis
        const importSentry = new Function('return import("@sentry/nextjs")');
        const sentryModule = await importSentry().catch(() => null);
        
        if (sentryModule) {
          const errorMessage = typeof data.message === 'string' ? data.message : 'Unknown monitoring error';
          sentryModule.captureException(new Error(errorMessage), { 
            extra: data,
            tags: {
              source: 'monitoring-api'
            }
          });
        }
      } catch {
        console.warn('Sentry not available for error tracking');
      }
    }

    // Example: Send performance metrics to DataDog (deferred loading)
    if (type === 'performance' && process.env.DATADOG_API_KEY) {
      // Dynamically import DataDog client
      // const { StatsD } = await import('node-statsd');
      // const client = new StatsD();
      // client.increment('app.performance.page_load', 1, {
      //   url: data.url,
      //   load_time: data.pageLoadTime,
      // });
    }

    // Example: Send user events to Google Analytics (deferred loading)
    if (type === 'event' && process.env.GOOGLE_ANALYTICS_ID) {
      // Use Measurement Protocol for server-side GA events
      const measurementId = process.env.GOOGLE_ANALYTICS_ID;
      const apiSecret = process.env.GA_API_SECRET;
      
      if (apiSecret) {
        await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
          method: 'POST',
          body: JSON.stringify({
            client_id: 'server-side',
            events: [{
              name: data.name,
              parameters: data.properties || {}
            }]
          })
        });
      }
    }

    // Example: Send metrics to custom monitoring service (deferred loading)
    if (process.env.CUSTOM_MONITORING_ENDPOINT) {
      await fetch(process.env.CUSTOM_MONITORING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CUSTOM_MONITORING_TOKEN}`
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: new Date().toISOString(),
          source: 'my-ai-outfit-app'
        })
      });
    }
  } catch (error) {
    // Silently fail to avoid breaking the monitoring endpoint
    console.warn('Failed to send to external monitoring service:', error);
  }
}
