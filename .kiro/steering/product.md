# Product Overview

## What is What to Wear?

A Next.js full-stack wardrobe management and outfit generation application that helps users create and discover clothing combinations from their personal wardrobe. The app features multi-user authentication, persistent data storage, custom image upload with background removal, and an intelligent outfit engine that generates combinations based on style compatibility, seasonal appropriateness, and user preferences, enhanced with real-time weather integration for location-based outfit recommendations.

## Core Features

- **Multi-User Authentication**: Secure user accounts with email/password and Google OAuth via Supabase Auth
- **Personal Wardrobe Management**: Private, user-specific wardrobe collections with database persistence
- **Custom Image Upload**: Upload wardrobe item photos with automatic background removal processing
- **Smart Outfit Generation**: AI-powered outfit recommendations based on style compatibility and scoring algorithms
- **Anchor-Based Discovery**: Find outfits that work well with a specific item as the foundation
- **Weather Integration**: 3-day weather forecast with location-based outfit suggestions (authenticated users only)
- **My Sizes System**: Pre-seeded clothing size categories with measurement guides for accurate size tracking across brands
- **Real-Time Scoring**: Live outfit compatibility scoring with detailed breakdown popovers
- **Mobile-First Design**: Optimized responsive design for all device sizes with touch-friendly interactions
- **PWA Support**: Progressive Web App with offline capabilities and service worker
- **Data Security**: Row Level Security (RLS) ensures complete data isolation between users

## Target Users

Fashion-conscious individuals who want to:
- Organize their personal wardrobe digitally with secure, private storage
- Upload and manage their own clothing item photos
- Get intelligent outfit suggestions based on their actual wardrobe
- Make weather-appropriate clothing choices with location-based recommendations
- Track their clothing sizes across different categories and brands
- Access accurate measurement guides for proper sizing
- Discover new combinations from their existing clothes
- Streamline their daily outfit selection process
- Access their wardrobe data across multiple devices with cloud synchronization

## Key Value Propositions

1. **Personal & Secure**: Multi-user authentication with complete data privacy and isolation
2. **Custom Wardrobe**: Upload your own clothing photos with automatic background removal
3. **Intelligent Recommendations**: Uses scoring algorithms based on formality, style consistency, and compatibility
4. **Weather-Aware Suggestions**: Location-based outfit recommendations considering current and forecasted weather
5. **Size Management**: Pre-seeded categories with measurement guides for accurate size tracking across brands
6. **Real-Time Feedback**: Live outfit scoring with detailed compatibility breakdowns
7. **Cross-Device Sync**: Access your wardrobe from any device with cloud-based data storage
8. **Mobile-Optimized**: Touch-friendly design with proper spacing and responsive layouts
9. **Offline Capability**: PWA features ensure functionality even without internet connection

## My Sizes Feature

The My Sizes feature provides a comprehensive size management system to help users track their clothing sizes across different categories and brands.

### System Categories

**Automatic Seeding**: All users receive 16 pre-seeded clothing categories on first access:
- **8 Men's Categories**: Dress Shirt, Casual Shirt, Suit Jacket, Pants, Jeans, Shoes, Belt, Coat/Jacket
- **8 Women's Categories**: Dress, Blouse/Top, Pants, Jeans, Shoes, Jacket/Coat, Suit Jacket, Belt

**Gender-Specific Design**: Categories are tailored to match real-world sizing conventions:
- Men's dress shirts use collar/sleeve measurements
- Women's dresses include bust/waist/hip measurements
- Appropriate sizing formats for each category (letter, numeric, waist-inseam, measurements)

### Measurement Guides

Each category includes comprehensive measurement guides:
- **Step-by-step instructions** for accurate measuring
- **Category-specific fields** (e.g., collar and sleeve for dress shirts, bust/waist/hips for dresses)
- **Typical size ranges** to validate measurements
- **Size examples** showing common formats
- **Helpful tips** for best practices

### Core Functionality

**Standard Sizes**: Track your primary size for each category
- Primary and optional secondary size fields
- Free-text notes for additional details
- One standard size per category

**Brand Sizes**: Record brand-specific sizes that differ from standard
- Brand name and optional item type
- Brand-specific size value
- Fit scale rating (1-5: runs small to runs large)
- Notes for fit details

**Pinned Cards**: Quick access to frequently used categories
- Pin important categories to the top
- Customizable display order
- Multiple display modes (standard, dual, preferred brand)

**Display Modes**:
- **Standard**: Show standard size only
- **Dual**: Show both standard and preferred brand size
- **Preferred Brand**: Show specific brand size prominently

### User Experience

**Simplified Workflow**:
1. Categories auto-seed on first visit (no manual setup required)
2. View measurement guides for accurate sizing
3. Enter standard size for each category
4. Add brand-specific sizes as needed
5. Pin frequently used categories for quick access

**No Category Management**: Users cannot add or delete system categories, ensuring:
- Consistent data structure across all users
- Simplified user experience
- Focus on entering sizes rather than managing categories

### Data Privacy

All My Sizes data uses Row Level Security (RLS):
- Complete data isolation between users
- Users can only access their own size data
- System categories are user-specific (not shared)
- Secure storage in Supabase PostgreSQL