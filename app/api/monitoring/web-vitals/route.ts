/**
 * Web Vitals API Endpoint
 * 
 * Receives Core Web Vitals metrics from the client and stores them
 * for analysis and monitoring.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const webVitalsSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  delta: z.number(),
  navigationType: z.string(),
  timestamp: z.number()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const metric = webVitalsSchema.parse(body)

    // Log metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals API]', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating
      })
    }

    // In production, you would send this to your analytics service
    // Examples:
    // - Google Analytics
    // - Vercel Analytics
    // - Custom analytics database
    // - Application Performance Monitoring (APM) service
    
    // For now, we'll just acknowledge receipt
    return NextResponse.json({ 
      success: true,
      metric: metric.name 
    })
  } catch (error) {
    console.error('Error processing web vitals:', error)
    return NextResponse.json(
      { error: 'Invalid metric data' },
      { status: 400 }
    )
  }
}

export const runtime = 'edge'
