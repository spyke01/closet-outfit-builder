# Closet Outfit Builder

A React-based wardrobe management and outfit generation application that helps users create and discover clothing combinations from their personal wardrobe. The app features an intelligent outfit engine that generates combinations based on style compatibility, seasonal appropriateness, and user preferences, enhanced with real-time weather integration for location-based outfit recommendations.

## Features

- **Interactive Wardrobe Management**: Browse and select items from categorized clothing collections with 7-category layering system
- **Smart Outfit Generation**: AI-powered outfit recommendations based on style compatibility and layer-aware scoring
- **Enhanced Scoring Algorithm**: Layer-aware formality calculations that account for clothing visibility and layering effects
- **Visual Outfit Display**: Flip card interface with SVG-based clothing representations showing proper layering
- **Brand Management**: Optional brand tracking and display for wardrobe items
- **User Settings**: Customizable preferences including brand display toggles
- **Anchor-Based Discovery**: Find outfits that work well with a specific item as the foundation
- **Weather Integration**: 3-day weather forecast with location-based outfit suggestions
- **Mobile-First Design**: Optimized responsive design for all device sizes
- **Direct Item Interactions**: Simplified UI with direct click interactions on wardrobe items
- **PWA Support**: Progressive Web App with offline capabilities
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Secure API Integration**: Server-side API key protection via Netlify Functions

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Netlify Functions (serverless)
- **APIs**: OpenWeatherMap API
- **PWA**: Service Worker for offline functionality
- **Testing**: Vitest with Testing Library

## Project Structure

```
src/
├── components/          # React components
│   ├── AnchorRow.tsx   # Category selection interface
│   ├── ItemsGrid.tsx   # Grid display for wardrobe items (direct click interactions)
│   ├── OutfitDisplay.tsx # Main outfit visualization
│   ├── OutfitCard.tsx  # Individual outfit card component with flip functionality
│   ├── OutfitList.tsx  # Outfit list display (default view)
│   ├── ResultsPanel.tsx # Outfit recommendations panel
│   ├── SelectionStrip.tsx # Selected items display (mobile-optimized)
│   ├── TopBar.tsx      # Navigation with weather widget
│   ├── WeatherWidget.tsx # 3-day weather forecast display
│   ├── SettingsPage.tsx # User settings and preferences management
│   ├── OutfitLayout.tsx # Visual SVG-based outfit display
│   ├── ScoreBreakdown.tsx # Enhanced score breakdown with layer weights
│   ├── svg/            # SVG clothing item components
│   │   ├── ClothingItemSVG.tsx # Generic SVG clothing renderer
│   │   ├── JacketSVG.tsx # Jacket and outerwear SVGs
│   │   ├── TShirtSVG.tsx # T-shirt and undershirt SVGs
│   │   ├── PoloSVG.tsx  # Polo shirt SVGs
│   │   ├── LongSleeveSVG.tsx # Long sleeve shirt SVGs
│   │   ├── ChinosSVG.tsx # Pants and chinos SVGs
│   │   ├── ShortsSVG.tsx # Shorts SVGs
│   │   ├── SneakersSVG.tsx # Sneakers and casual shoes SVGs
│   │   ├── LoafersSVG.tsx # Loafers and dress shoes SVGs
│   │   ├── BeltSVG.tsx  # Belt SVGs
│   │   ├── DressWatchSVG.tsx # Dress watch SVGs
│   │   └── DiverWatchSVG.tsx # Diver watch SVGs
│   └── ScrollToTop.tsx # Navigation utility component
├── data/               # Static data files
│   ├── outfits.json    # Curated outfit combinations
│   └── wardrobe.json   # Wardrobe items database
├── hooks/              # Custom React hooks
│   ├── useOutfitEngine.ts # Outfit generation logic
│   └── useWardrobe.ts  # Wardrobe data management
├── services/           # API integration services
│   ├── weatherService.ts # Weather API integration
│   └── locationService.ts # Geolocation handling
├── types/              # TypeScript type definitions
│   └── index.ts        # Core application and weather types
├── utils/              # Utility functions
│   ├── colorUtils.ts   # Color manipulation utilities
│   ├── scoring.ts      # Enhanced scoring algorithms with layer awareness
│   └── itemUtils.ts    # Item formatting and display utilities
├── contexts/           # React context providers
│   └── SettingsContext.tsx # User settings management and persistence
├── config/             # Configuration files
│   └── env.ts          # Environment configuration
├── App.tsx             # Main application component (shows outfits by default)
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

```
netlify/
└── functions/          # Serverless functions for secure API proxying
    ├── weather.ts      # Weather API proxy with rate limiting

    ├── package.json    # Function dependencies
    └── tsconfig.json   # TypeScript configuration for functions
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- API keys for weather integration (see [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for setup)

### Local Development Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd closet-outfit-builder
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your actual API keys

# OPENWEATHER_API_KEY=your_openweathermap_api_key_here
```

4. **Start the development server:**
```bash
# For basic development (without weather features)
npm run dev

# For full development with Netlify Functions (recommended)
npm run dev:netlify
```

The application will be available at:
- Basic dev server: `http://localhost:5173`
- Netlify dev server: `http://localhost:8888`

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run dev:netlify` - Start Netlify dev environment with functions
- `npm run build` - Build the application for production
- `npm run generate:outfits` - Build outfits from wardrobe
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once

## Weather Integration

The app provides location-based weather forecasts using OpenWeatherMap API. Weather data is securely accessed through Netlify Functions, with location obtained directly from the browser's geolocation API.

### Quick Setup

```bash
# Copy environment template and add your API keys
cp .env.example .env.local

# Start development with weather functions
npm run dev:netlify
```

For complete API setup and production deployment, see [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md).

## Data Structure

### Wardrobe Items

Each clothing item includes:
- **Category**: 7-category layering system - Jacket/Overshirt, Shirt, Undershirt, Pants, Shoes, Belt, Watch
- **Brand**: Optional brand information for item identification and organization
- **Capsule Tags**: Style classifications (Refined, Adventurer, Crossover, Shorts)
- **Metadata**: Color, material, season, formality level
- **Layering Hierarchy**: Items are organized by how they layer on the body for realistic outfit composition

### Curated Outfits

Pre-defined outfit combinations with:
- Item references by ID
- Tuck style preferences (Tucked/Untucked)
- Weight scoring for recommendation priority

### Weather Data

Weather integration provides:
- **Current Conditions**: Temperature, weather description, icon
- **3-Day Forecast**: High/low temperatures, conditions, precipitation chance
- **Location Data**: Coordinates from browser geolocation or address input

## Enhanced Features

### 7-Category Layering System

The wardrobe now uses a realistic layering hierarchy that matches how clothing is actually worn:

1. **Jacket/Overshirt** (outermost layer)
2. **Shirt** (middle layer)
3. **Undershirt** (base layer) - NEW category for t-shirts and base layers
4. **Pants** (lower body)
5. **Shoes** (footwear)
6. **Belt** (accessories)
7. **Watch** (accessories)

This structure allows for more accurate outfit composition and better reflects real-world dressing patterns.

### Layer-Aware Scoring Algorithm

The enhanced scoring system accounts for how clothing layers interact:

- **Visibility Weighting**: Items covered by other layers have reduced impact on formality scores
  - Undershirt covered by shirt: 30% weight
  - Shirt covered by jacket: 70% weight
  - Visible items: 100% weight
- **Transparent Scoring**: Score breakdown shows individual item contributions and applied weights
- **Layer Adjustments**: Clear indication of why certain items have reduced scoring impact

### Visual Outfit Display

Interactive flip cards provide visual outfit representations:

- **SVG Clothing Items**: Scalable vector graphics for jackets, shirts, pants, shoes, and accessories
- **Proper Layering**: Visual stacking matches clothing hierarchy (jacket over shirt over undershirt)
- **Color Application**: SVG items display in the actual colors of selected wardrobe items
- **Flip Animation**: Smooth transitions between text-based and visual outfit views
- **Responsive Design**: Visual layouts adapt to different screen sizes

### Brand Management System

Optional brand tracking enhances wardrobe organization:

- **Brand Field**: Optional brand information for each wardrobe item
- **Flexible Display**: Items work with or without brand information
- **Consistent Formatting**: "Brand Item (Color)" format when brands are shown
- **Settings Integration**: User can toggle brand display on/off globally

### User Settings

Customizable preferences for personalized experience:

- **Settings Page**: Dedicated interface for managing user preferences
- **Brand Display Toggle**: Show or hide brand information throughout the app
- **Persistent Storage**: Settings saved locally and persist across sessions
- **Immediate Updates**: Changes take effect instantly without page refresh

## Component Architecture

### Key Component Changes

**App Component:**
- Now displays all outfits by default on page load
- Removed dependency on "Show All" button functionality
- Integrated weather service initialization

**TopBar Component:**
- Removed "Show All" button (functionality no longer needed)
- Integrated WeatherWidget for location-based weather display
- Maintains responsive design for mobile devices

**ItemsGrid Component:**
- Removed "View" and "Build From" buttons from item cards
- Implemented direct click interactions on item containers
- Added hover states with pointer cursor for better UX
- Enhanced accessibility with proper ARIA labels

**WeatherWidget Component:**
- Displays 3-day weather forecast with high/low temperatures
- Shows weather icons, dates, and precipitation chances
- Comprehensive error handling with user-friendly messages
- Graceful degradation when weather data is unavailable
- Retry functionality for recoverable errors

**OutfitCard Component (Enhanced):**
- Flip card functionality with smooth CSS transitions
- Front face shows traditional text-based outfit information
- Back face displays visual SVG-based outfit layout
- Interactive flip triggers and touch-friendly design
- Responsive sizing for different screen sizes

**SettingsPage Component:**
- Dedicated settings interface with feature toggles
- Brand display toggle with immediate effect
- Local storage persistence for user preferences
- Responsive design matching app aesthetic
- Navigation integration with main app flow

**OutfitLayout Component:**
- Visual outfit representation using SVG components
- Proper layering hierarchy (jacket over shirt over undershirt)
- Color application from actual wardrobe item colors
- Graceful handling of missing items (skips empty layers)
- Responsive sizing and positioning

**SVG Clothing Components:**
- Scalable vector graphics for all clothing types
- CSS-based coloring system for dynamic color application
- Proper z-index layering for visual stacking
- Optimized paths for fast rendering and small file sizes
- Consistent styling and proportions across all items

**ScoreBreakdown Component (Enhanced):**
- Displays individual component scores with applied weights
- Shows layer adjustment reasons (covered/visible/accessory)
- Visual indicators for weight impacts on final score
- Transparent scoring explanation for user understanding
- Responsive layout for mobile and desktop viewing

**SelectionStrip Component:**
- Mobile-first responsive design with horizontal scrolling
- Touch-friendly interactions with minimum 44px touch targets
- Optimized for iPhone and tablet viewports

### Mobile Responsiveness

The app now follows a mobile-first approach:

- **Breakpoints**: Mobile (320px+), Tablet (768px+), Desktop (1024px+)
- **Touch Targets**: Minimum 44px for all interactive elements
- **Scrolling**: Horizontal scroll for SelectionStrip on mobile
- **Layout**: Responsive grid systems that adapt to screen size
- **Typography**: Scalable text sizes across devices

## Development

### Adding New Items

1. Add items to `src/data/wardrobe.json` with proper categorization and tags
2. Use the 7-category system: Jacket/Overshirt, Shirt, Undershirt, Pants, Shoes, Belt, Watch
3. Follow the standardized naming format: "Item Type (Color)"
4. Optionally include brand information in the brand field
5. The app will automatically load and categorize new items



### Creating Outfit Combinations (automated)

1. Run `npm run generate:outfits`
2. If you would like more outfits to be generated you can adjust the tunable options in `scripts/generate-outfits.js`

### Creating Outfit Combinations (Manual)

1. Add outfit definitions to `src/data/outfits.json`
2. Reference items by their unique IDs
3. Include styling preferences and weight scores

### Weather Service Integration

The weather service (`src/services/weatherService.ts`) provides:
- Location-based weather fetching via browser geolocation
- Integration with Netlify Functions for secure API access
- Caching and retry logic for improved reliability
- Error handling for various failure scenarios

### Testing

```bash
# Run all tests
npm test

# Run tests once
npm run test:run

# Test specific features
npm test -- --grep "weather"
npm test -- --grep "WeatherWidget"
npm test -- --grep "scoring"
npm test -- --grep "OutfitCard"
npm test -- --grep "SettingsPage"
npm test -- --grep "SVG"
```

### Customizing Styles

The app uses Tailwind CSS for styling. Key customization areas:
- Modify component classes for visual changes
- Extend `tailwind.config.js` for custom breakpoints or utilities
- Update responsive design breakpoints in components
- Customize weather widget appearance and layout

## Building for Production

```bash
# Build the application
npm run build

# Preview the production build locally
npm run preview
```

This creates an optimized build in the `dist/` directory with:
- Minified JavaScript and CSS
- Optimized assets and images
- Service worker for PWA functionality
- Netlify Functions compiled and ready for deployment

## Deployment

For complete deployment instructions and production setup:

- **[NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)** - Comprehensive deployment guide with API setup, security configuration, and testing
- **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** - Step-by-step checklist to ensure proper deployment

### Quick Deploy

```bash
# Build for production
npm run build

# Test deployment locally
npm run verify:local
```

## Troubleshooting

For detailed troubleshooting guides, see:
- **[NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)** - Deployment and API configuration issues
- **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** - Production environment troubleshooting

### Common Development Issues

**Functions Not Working Locally:**
```bash
npm run dev:netlify  # Use this instead of npm run dev
```

**Environment Variables:**
- Copy `.env.example` to `.env.local` and add your API keys
- Restart dev server after changing environment variables

## PWA Features

The application includes:
- Service worker for offline functionality
- Web app manifest for installation capability
- Responsive design optimized for mobile devices
- Caching strategies for improved performance



## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the mobile-first approach
4. Run linting and ensure all tests pass
5. Submit a pull request with detailed description

For development setup including weather integration, see [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md).

## License

This project is private and proprietary