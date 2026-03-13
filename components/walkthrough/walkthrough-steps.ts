import type { WalkthroughStep } from '@/lib/types/walkthrough';

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    targetId: 'wardrobe-item-first',
    title: 'Your wardrobe',
    body: 'These are the items you just added. Tap any item to view or edit it.',
    position: 'bottom',
  },
  {
    targetId: 'wardrobe-add-button',
    title: 'Add more items',
    body: 'Grow your wardrobe by adding clothing here anytime.',
    position: 'bottom',
  },
  {
    targetId: 'nav-outfits',
    title: 'Build outfits',
    body: 'Combine items into saved outfits you can wear again.',
    position: 'bottom',
  },
  {
    targetId: 'nav-today',
    title: 'Daily recommendation',
    body: 'Your AI-powered outfit suggestion for today lives here.',
    position: 'bottom',
  },
  {
    targetId: 'sebastian-button',
    title: 'Meet Sebastian',
    body: 'Ask Sebastian for styling advice anytime. Free users get limited access — upgrade for unlimited.',
    position: 'top',
  },
];
