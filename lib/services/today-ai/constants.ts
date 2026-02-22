export const TODAY_AI_STYLE_PRESETS = [
  'Minimal',
  'Ivy',
  'Streetwear',
  'Classic',
  'Smart Casual',
  'Business Formal',
  'Contemporary',
  'Monochrome',
] as const;

export const TODAY_AI_EVENT_PRESETS = [
  'Work Day',
  'Client Meeting',
  'Date Night',
  'Dinner',
  'Wedding Guest',
  'Social Event',
  'Weekend Outing',
  'Travel Day',
] as const;

export type TodayAiStylePreset = (typeof TODAY_AI_STYLE_PRESETS)[number];
export type TodayAiEventPreset = (typeof TODAY_AI_EVENT_PRESETS)[number];
export type TodayAiFormality = 'casual' | 'smart' | 'formal';

const STYLE_GUIDANCE: Record<string, string> = {
  Minimal:
    'Clean lines, restrained palette, minimal layering, subtle textures, no loud logos or flashy contrasts.',
  Ivy:
    'Ivy/collegiate prep: OCBD or striped shirt, chinos or wool trousers, sportcoat or quilted vest optional, loafers/brogues/clean boots; avoid gym tees and overly rugged workwear for smart office settings.',
  Streetwear:
    'Relaxed silhouettes, elevated casual layering, modern sneakers/boots, strong texture contrast, avoid overly formal tailoring unless explicitly requested.',
  Classic:
    'Timeless menswear staples, balanced proportions, conservative color pairings, polished but not trend-driven.',
  'Smart Casual':
    'Polished casual mix: refined shirt/knit with structured bottoms and clean footwear; avoid either extreme formal or athletic looks.',
  'Business Formal':
    'Structured, office-appropriate tailoring, refined shirting, formal trousers, dress footwear, cohesive accessories.',
  Contemporary:
    'Modern fit and silhouette with tasteful statement piece, balanced by neutral anchors and clean finishing items.',
  Monochrome:
    'Single-tone or close tonal family across pieces, texture variation for depth, no clashing accent color.',
};

const EVENT_GUIDANCE: Record<string, string> = {
  'Work Day': 'Office-ready and practical for a full workday. Prioritize professional polish and comfort.',
  'Client Meeting': 'More polished and trustworthy presentation; prioritize sharp, structured, and conservative choices.',
  'Date Night': 'Refined and attractive without looking stiff; subtle contrast and texture preferred.',
  Dinner: 'Smart social polish; avoid overly casual gym-like pieces.',
  'Wedding Guest': 'Event-appropriate refinement and elevated formality.',
  'Social Event': 'Expressive but cohesive; avoid sloppy or overly rigid formal combinations.',
  'Weekend Outing': 'Relaxed comfort with visual intention; practical footwear and layering.',
  'Travel Day': 'Comfort-forward but put-together; prioritize movement and layering adaptability.',
};

export function getFormalityRange(formality: TodayAiFormality): { min: number; max: number } {
  if (formality === 'casual') return { min: 1, max: 4 };
  if (formality === 'smart') return { min: 4, max: 7 };
  return { min: 7, max: 10 };
}

export function getFormalityBand(formality: TodayAiFormality): 'casual' | 'smart-casual' | 'refined' {
  if (formality === 'casual') return 'casual';
  if (formality === 'smart') return 'smart-casual';
  return 'refined';
}

export function getStyleGuidance(stylePreset: string): string {
  return STYLE_GUIDANCE[stylePreset] || 'Apply the style faithfully while keeping the look cohesive and practical.';
}

export function getEventGuidance(eventType: string): string {
  return EVENT_GUIDANCE[eventType] || 'Match the outfit to the event context with practical polish.';
}
