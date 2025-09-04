# Closet Outfit Builder

A React-based wardrobe management and outfit generation application that helps users create and discover clothing combinations from their personal wardrobe. The app features an intelligent outfit engine that generates combinations based on style compatibility, seasonal appropriateness, and user preferences, enhanced with real-time weather integration for location-based outfit recommendations.

## Features

- **Interactive Wardrobe Management**: Browse and select items from categorized clothing collections
- **Smart Outfit Generation**: AI-powered outfit recommendations based on style compatibility
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
- **APIs**: Google Maps Geocoding API, OpenWeatherMap API
- **PWA**: Service Worker for offline functionality
- **Testing**: Vitest with Testing Library

## Project Structure

```
src/
├── components/          # React components
│   ├── AnchorRow.tsx   # Category selection interface
│   ├── ItemsGrid.tsx   # Grid display for wardrobe items (direct click interactions)
│   ├── OutfitDisplay.tsx # Main outfit visualization
│   ├── OutfitCard.tsx  # Individual outfit card component
│   ├── OutfitList.tsx  # Outfit list display (default view)
│   ├── ResultsPanel.tsx # Outfit recommendations panel
│   ├── SelectionStrip.tsx # Selected items display (mobile-optimized)
│   ├── TopBar.tsx      # Navigation with weather widget
│   ├── WeatherWidget.tsx # 3-day weather forecast display
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
│   └── colorUtils.ts   # Color manipulation utilities
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
    ├── geocoding.ts    # Google Maps Geocoding API proxy
    ├── package.json    # Function dependencies
    └── tsconfig.json   # TypeScript configuration for functions
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Google Cloud Platform account (for weather integration)
- OpenWeatherMap API account (for weather data)

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
# GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
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
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once

## Weather Integration Setup

### Google Cloud Platform Configuration

1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable billing for the project

2. **Enable Required APIs:**
   ```bash
   # Enable Google Maps Geocoding API
   gcloud services enable geocoding-backend.googleapis.com
   
   # Or enable via the console:
   # - Go to APIs & Services > Library
   # - Search for "Geocoding API" and enable it
   ```

3. **Create API Credentials:**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

4. **Configure Domain Restrictions (Security):**
   - Click on your API key to edit it
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domains:
     ```
     http://localhost:8888/*
     https://your-netlify-site.netlify.app/*
     https://your-custom-domain.com/*
     ```

### OpenWeatherMap API Setup

1. **Create Account:**
   - Go to [OpenWeatherMap](https://openweathermap.org/api)
   - Sign up for a free account

2. **Get API Key:**
   - Go to your account dashboard
   - Copy your API key from the "API keys" tab
   - Note: Free tier includes 1,000 calls/day

3. **API Endpoints Used:**
   - Current Weather API (free tier)
   - 5-day Weather Forecast (free tier)
   - One Call API 3.0 (paid tier, optional)

4. **API Fallback Strategy:**
   The weather service automatically tries these APIs in order:
   - **One Call API 3.0** (if you have a subscription): Provides current weather + 8-day daily forecast
   - **Free Tier APIs** (fallback): Uses Current Weather + 5-Day Forecast APIs when One Call API is unavailable

### Environment Variables

Create a `.env.local` file in your project root:

```bash
# Google Maps API Key (for geocoding location data)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# OpenWeatherMap API Key (for weather data)
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
```

**Important Security Notes:**
- Never commit `.env.local` to version control (already in `.gitignore`)
- Use different API keys for development vs production
- Configure domain restrictions in Google Cloud Console
- API keys are accessed server-side via Netlify Functions to keep them secure

## Netlify Functions Deployment

### Local Development

The Netlify Functions are automatically available when using `npm run dev:netlify`:

- Weather API: `http://localhost:8888/api/weather?lat=40.7128&lon=-74.0060`
- Geocoding API: `http://localhost:8888/api/geocoding?address=New York, NY`

### Production Deployment

1. **Set Environment Variables in Netlify:**
   - Go to your Netlify site dashboard
   - Navigate to Site Settings > Environment Variables
   - Add the following variables:
     ```
     GOOGLE_MAPS_API_KEY=your_production_google_maps_api_key
     OPENWEATHER_API_KEY=your_production_openweathermap_api_key
     ```

2. **Deploy Configuration:**
   The `netlify.toml` file is already configured with:
   - Build settings for the React app
   - Function directory configuration
   - API endpoint redirects
   - Node.js version specification

3. **Function Endpoints:**
   - Weather: `https://your-site.netlify.app/api/weather`
   - Geocoding: `https://your-site.netlify.app/api/geocoding`

### Function Features

**Weather Function (`/api/weather`):**
- Rate limiting (10 requests/minute per IP)
- Coordinate validation
- Fallback from One Call API to free tier APIs
- Comprehensive error handling
- CORS support

**Geocoding Function (`/api/geocoding`):**
- Rate limiting (20 requests/minute per IP)
- Input sanitization
- Forward and reverse geocoding support
- Google API error handling
- CORS support

## Data Structure

### Wardrobe Items

Each clothing item includes:
- **Category**: Jacket/Overshirt, Shirt, Pants, Shoes, Belt, Watch
- **Capsule Tags**: Style classifications (Refined, Adventurer, Crossover, Shorts)
- **Metadata**: Color, material, season, formality level

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
2. The app will automatically load and categorize new items

### Creating Outfit Combinations

1. Add outfit definitions to `src/data/outfits.json`
2. Reference items by their unique IDs
3. Include styling preferences and weight scores

### Weather Service Integration

The weather service (`src/services/weatherService.ts`) provides:
- Location-based weather fetching via browser geolocation
- Integration with Netlify Functions for secure API access
- Caching and retry logic for improved reliability
- Error handling for various failure scenarios

### Testing Weather Features

```bash
# Run all tests including weather integration
npm test

# Run specific weather-related tests
npm test -- --grep "weather"
npm test -- --grep "WeatherWidget"

# Test Netlify Functions locally
npm run dev:netlify
# Then test endpoints:
# http://localhost:8888/api/weather?lat=40.7128&lon=-74.0060
# http://localhost:8888/api/geocoding?address=New York, NY
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

### Netlify Deployment

1. **Connect Repository:**
   - Link your Git repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`

2. **Configure Environment Variables:**
   ```
   GOOGLE_MAPS_API_KEY=your_production_api_key
   OPENWEATHER_API_KEY=your_production_api_key
   ```

3. **Domain Configuration:**
   - Update Google Cloud Console API restrictions with your production domain
   - Test weather functionality after deployment

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy dist/ directory to your hosting service
# Ensure Netlify Functions are supported or use alternative backend
```

## Troubleshooting

### Weather Integration Issues

**Location Permission Denied:**
- The app gracefully degrades to show outfits without weather context
- Users can manually refresh to retry location access

**API Key Errors:**
- Verify API keys are correctly set in environment variables
- Check Google Cloud Console for API quotas and billing
- Ensure domain restrictions match your deployment URL

**Weather Data Not Loading:**
- Check browser console for network errors
- Verify Netlify Functions are deployed and accessible
- Test API endpoints directly: `/api/weather?lat=40.7128&lon=-74.0060`

### Mobile Responsiveness Issues

**Horizontal Scrolling:**
- Ensure viewport meta tag is present in `index.html`
- Check SelectionStrip component for overflow issues
- Verify touch target sizes meet 44px minimum

**Layout Problems:**
- Test on actual devices, not just browser dev tools
- Check Tailwind responsive classes are applied correctly
- Verify CSS Grid and Flexbox implementations

### Development Issues

**Netlify Functions Not Working Locally:**
```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Start development with functions
npm run dev:netlify
```

**Environment Variables Not Loading:**
- Ensure `.env.local` exists and has correct format
- Restart development server after changing environment variables
- Check that variables are prefixed correctly for client/server usage

## PWA Features

The application includes:
- Service worker for offline functionality
- Web app manifest for installation capability
- Responsive design optimized for mobile devices
- Caching strategies for improved performance

## API Rate Limits

**OpenWeatherMap (Free Tier):**
- 1,000 calls/day
- 60 calls/minute

**Google Maps Geocoding:**
- $5.00 per 1,000 requests (after free tier)
- Rate limiting implemented in functions

**Function-Level Rate Limiting:**
- Weather API: 10 requests/minute per IP
- Geocoding API: 20 requests/minute per IP

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the mobile-first approach
4. Run linting and ensure all tests pass
5. Test weather integration with actual API keys
6. Submit a pull request with detailed description

## License

This project is private and proprietary