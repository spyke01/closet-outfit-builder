# Closet Outfit Builder

A React-based wardrobe management and outfit generation application that helps users create and discover clothing combinations from their personal wardrobe. The app features an intelligent outfit engine that generates combinations based on style compatibility, seasonal appropriateness, and user preferences.

## Features

- **Interactive Wardrobe Management**: Browse and select items from categorized clothing collections
- **Smart Outfit Generation**: AI-powered outfit recommendations based on style compatibility
- **Anchor-Based Discovery**: Find outfits that work well with a specific item as the foundation
- **Outfit Locking**: Lock specific items while randomizing others
- **Favorites System**: Save and manage favorite outfit combinations
- **PWA Support**: Progressive Web App with offline capabilities
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PWA**: Service Worker for offline functionality

## Project Structure

```
src/
├── components/          # React components
│   ├── AnchorRow.tsx   # Category selection interface
│   ├── ItemsGrid.tsx   # Grid display for wardrobe items
│   ├── OutfitDisplay.tsx # Main outfit visualization
│   ├── ResultsPanel.tsx # Outfit recommendations panel
│   ├── SelectionStrip.tsx # Selected items display
│   └── TopBar.tsx      # Navigation and actions
├── data/               # Static data files
│   ├── outfits.json    # Curated outfit combinations
│   └── wardrobe.json   # Wardrobe items database
├── hooks/              # Custom React hooks
│   ├── useOutfitEngine.ts # Outfit generation logic
│   └── useWardrobe.ts  # Wardrobe data management
├── types/              # TypeScript type definitions
│   └── index.ts        # Core application types
├── App.tsx             # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd closet-outfit-builder
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks

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

## Development

### Adding New Items

1. Add items to `src/data/wardrobe.json` with proper categorization and tags
2. The app will automatically load and categorize new items

### Creating Outfit Combinations

1. Add outfit definitions to `src/data/outfits.json`
2. Reference items by their unique IDs
3. Include styling preferences and weight scores

### Customizing Styles

The app uses Tailwind CSS for styling. Modify classes in components or extend the configuration in `tailwind.config.js`.

## Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory, ready for deployment to any static hosting service.

## PWA Features

The application includes:
- Service worker for offline functionality
- Web app manifest for installation
- Responsive design for mobile devices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and ensure tests pass
5. Submit a pull request

## License

This project is private and proprietary.