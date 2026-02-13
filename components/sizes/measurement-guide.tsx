'use client'

/**
 * MeasurementGuide Component
 * 
 * Displays category-specific measurement instructions to help users
 * accurately determine their sizes. Features collapsible sections,
 * visual diagrams, and comprehensive measurement tips.
 * 
 * Features:
 * - Collapsible/expandable sections for better UX
 * - Category-specific measurement fields with descriptions
 * - Visual measurement diagrams
 * - Size examples for reference
 * - Helpful measurement tips
 * - Dark mode support
 * - Mobile-responsive design
 * - Accessible with proper ARIA labels
 * 
 * Requirements: US-2
 */

import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Ruler, Info } from 'lucide-react'
import type { MeasurementGuide as MeasurementGuideType } from '@/lib/data/measurement-guides'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Mapping of diagram references to actual image files
 * Available images: dress-shirt.png, dress.png, pants.png, suit.png
 */
const DIAGRAM_IMAGE_MAP: Record<string, string | undefined> = {
  // Dress shirt measurements (collar, sleeve)
  'collar-measurement': '/images/measurements/dress-shirt.png',
  'sleeve-measurement': '/images/measurements/dress-shirt.png',
  
  // Suit/jacket measurements (chest, jacket length, shoulder)
  'chest-measurement': '/images/measurements/suit.png',
  'jacket-length': '/images/measurements/suit.png',
  'shoulder-measurement': '/images/measurements/suit.png',
  
  // Pants measurements (waist, inseam, hip)
  'waist-measurement': '/images/measurements/pants.png',
  'inseam-measurement': '/images/measurements/pants.png',
  'hip-measurement': '/images/measurements/pants.png',
  
  // Dress measurements (bust, waist, hip, shoulder)
  'bust-measurement': '/images/measurements/dress.png',
  
  // Belt measurements
  'belt-measurement': '/images/measurements/pants.png',
  
  // Foot measurements (no image available yet)
  'foot-length': undefined,
  'foot-width': undefined,
}

export interface MeasurementGuideProps {
  /** Measurement guide data for the category */
  guide: MeasurementGuideType
  /** Optional CSS class name */
  className?: string
  /** Whether the guide should be expanded by default */
  defaultExpanded?: boolean
}

/**
 * MeasurementGuide Component
 * 
 * Displays measurement instructions for a specific category.
 * 
 * @param guide - Measurement guide data
 * @param className - Optional additional CSS classes
 * @param defaultExpanded - Whether to show expanded by default (default: true)
 */
export function MeasurementGuide({
  guide,
  className = '',
  defaultExpanded = true,
}: MeasurementGuideProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ruler className="h-5 w-5 text-secondary" aria-hidden="true" />
              <span>Measurement Guide</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Learn how to measure for {guide.category_name}
            </CardDescription>
          </div>
          
          {/* Collapse/Expand button */}
          <button
            onClick={toggleExpanded}
            className="flex-shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground "
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse measurement guide' : 'Expand measurement guide'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Measurement Fields */}
          {guide.measurement_fields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                How to Measure
              </h3>
              
              <div className="space-y-4">
                {guide.measurement_fields.map((field, index) => (
                  <div
                    key={field.name}
                    className="rounded-lg border border-border bg-muted p-4 border-border bg-card/50"
                  >
                    {/* Field label */}
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary/20 text-xs font-semibold text-foreground">
                        {index + 1}
                      </span>
                      <h4 className="font-medium text-foreground">
                        {field.label}
                      </h4>
                      {field.unit && (
                        <span className="text-xs text-muted-foreground">
                          ({field.unit})
                        </span>
                      )}
                    </div>

                    {/* Field description */}
                    <p className="text-sm text-muted-foreground">
                      {field.description}
                    </p>

                    {/* Typical range */}
                    {field.typical_range && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Typical range: {field.typical_range[0]}-{field.typical_range[1]} {field.unit}
                      </div>
                    )}

                    {/* Options */}
                    {field.options && field.options.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Options:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {field.options.map((option) => (
                            <span
                              key={option}
                              className="inline-flex items-center rounded-md bg-background px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-ring"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Visual diagram - only show if image exists */}
                    {field.diagram_ref && DIAGRAM_IMAGE_MAP[field.diagram_ref] && (
                      <div className="mt-3 rounded-md border border-border bg-background p-4">
                        <Image
                          src={DIAGRAM_IMAGE_MAP[field.diagram_ref]}
                          alt={`How to measure ${field.label}`}
                          width={360}
                          height={240}
                          className="w-full max-w-[320px] sm:max-w-[380px] h-auto object-contain rounded-md mx-auto"
                          priority={false}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Size Examples */}
          {guide.size_examples.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Example Sizes
              </h3>
              <div className="flex flex-wrap gap-2">
                {guide.size_examples.map((example) => (
                  <span
                    key={example}
                    className="inline-flex items-center rounded-md bg-secondary/20 px-3 py-1 text-sm font-medium text-foreground"
                  >
                    {example}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {guide.tips && guide.tips.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Info className="h-4 w-4 text-secondary" aria-hidden="true" />
                <span>Helpful Tips</span>
              </h3>
              <ul className="space-y-2" role="list">
                {guide.tips.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" aria-hidden="true" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gender indicator */}
          <div className="border-t border-border pt-4 border-border">
            <p className="text-xs text-muted-foreground">
              This guide is for{' '}
              <span className="font-medium capitalize">
                {guide.gender === 'unisex' ? 'all genders' : `${guide.gender}'s`}
              </span>{' '}
              sizing
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
