import { useState, useEffect } from 'react';
import { Shuffle } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { AnchorRow } from './components/AnchorRow';
import { SelectionStrip } from './components/SelectionStrip';
import { ItemsGrid } from './components/ItemsGrid';
import { OutfitDisplay } from './components/OutfitDisplay';
import { OutfitCard } from './components/OutfitCard';
import { ScrollToTop } from './components/ScrollToTop';
import { SettingsPage } from './components/SettingsPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useWardrobe } from './hooks/useWardrobe';
import { useOutfitEngine } from './hooks/useOutfitEngine';
import { Category, OutfitSelection, WardrobeItem, GeneratedOutfit, categoryToKey, WeatherData, WeatherError } from './types';
import { getCurrentLocation } from './services/locationService';
import { getWeatherData } from './services/weatherService';

function App() {
  const { itemsByCategory, loading } = useWardrobe();
  const { generateRandomOutfit, getAllOutfits } = useOutfitEngine();

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selection, setSelection] = useState<OutfitSelection>({});
  const [anchorItem, setAnchorItem] = useState<WardrobeItem | null>(null);
  const [showRandomOutfit, setShowRandomOutfit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Weather state
  const [weatherForecast, setWeatherForecast] = useState<WeatherData[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<WeatherError | null>(null);
  const [weatherRetryCount, setWeatherRetryCount] = useState(0);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // Load weather data with comprehensive error handling
  const loadWeatherData = async (isRetry = false) => {
    // Don't retry if location permission was explicitly denied
    if (locationPermissionDenied && !isRetry) {
      return;
    }

    setWeatherLoading(true);
    setWeatherError(null);

    try {
      const location = await getCurrentLocation();

      if (location.granted) {
        setLocationPermissionDenied(false);
        const forecast = await getWeatherData(location.latitude, location.longitude);
        setWeatherForecast(forecast);
        setWeatherRetryCount(0); // Reset retry count on success
      } else {
        // Handle location permission denied
        setLocationPermissionDenied(true);
        const locationError: WeatherError = {
          code: 'LOCATION_ERROR',
          message: 'Location access is required to show weather information. Please enable location permissions in your browser settings.',
          details: location.error
        };
        setWeatherError(locationError);
      }
    } catch (error) {
      console.error('Weather loading error:', error);

      // Handle different types of errors with appropriate user messaging
      let weatherError: WeatherError;

      if (error && typeof error === 'object' && 'code' in error) {
        // This is already a WeatherError from our services
        weatherError = error as WeatherError;
      } else if (error instanceof Error) {
        // Network or other generic errors
        if (error.message.includes('fetch')) {
          weatherError = {
            code: 'NETWORK_ERROR',
            message: 'Unable to connect to weather service. Please check your internet connection.',
            details: error.message
          };
        } else {
          weatherError = {
            code: 'API_ERROR',
            message: 'Weather service is temporarily unavailable. Please try again later.',
            details: error.message
          };
        }
      } else {
        weatherError = {
          code: 'API_ERROR',
          message: 'An unexpected error occurred while loading weather data.',
          details: 'Unknown error'
        };
      }

      setWeatherError(weatherError);

      // Increment retry count for rate limiting
      if (isRetry) {
        setWeatherRetryCount(prev => prev + 1);
      }
    } finally {
      setWeatherLoading(false);
    }
  };

  // Retry weather data loading with exponential backoff
  const retryWeatherData = () => {
    // Limit retry attempts to prevent spam
    if (weatherRetryCount >= 3) {
      setWeatherError({
        code: 'API_ERROR',
        message: 'Weather service is currently unavailable. Please try again later.',
        details: 'Maximum retry attempts exceeded'
      });
      return;
    }

    // Exponential backoff delay
    const delay = Math.pow(2, weatherRetryCount) * 1000; // 1s, 2s, 4s

    setTimeout(() => {
      loadWeatherData(true);
    }, delay);
  };

  // Register service worker for PWA and load weather data
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

    loadWeatherData();
  }, []);

  const handleItemSelect = (item: WardrobeItem) => {
    // Reset all selections when starting with a new anchor item
    const key = categoryToKey(item.category);
    setSelection({
      [key]: item
    });
    // Set the selected item as anchor to show SelectionStrip and outfits
    setAnchorItem(item);
    // After selecting an item, go back to outfit display
    setSelectedCategory(null);
    setShowRandomOutfit(false);
  };



  const handleRandomize = () => {
    const randomOutfit = generateRandomOutfit(selection);
    if (randomOutfit) {
      setSelection({
        jacket: randomOutfit.jacket,
        shirt: randomOutfit.shirt,
        pants: randomOutfit.pants,
        shoes: randomOutfit.shoes,
        belt: randomOutfit.belt,
        watch: randomOutfit.watch,
        tuck: randomOutfit.tuck,
        loved: randomOutfit?.loved
      });
      // Show the random outfit in a separate view
      setShowRandomOutfit(true);
      setSelectedCategory(null);
      setAnchorItem(null);
    }
  };



  const handleSelectionChange = (category: Category, item: WardrobeItem | null) => {
    const key = categoryToKey(category);
    setSelection(prev => ({
      ...prev,
      [key]: item || undefined
    }));
  };

  const handleOutfitSelect = (outfit: GeneratedOutfit) => {
    setSelection({
      jacket: outfit.jacket,
      shirt: outfit.shirt,
      pants: outfit.pants,
      shoes: outfit.shoes,
      belt: outfit.belt,
      watch: outfit.watch,
      tuck: outfit.tuck,
      loved: outfit.loved
    });
    // Show the selected outfit in detail view
    setShowRandomOutfit(true);
    setAnchorItem(null);
    setSelectedCategory(null);
  };

  const handleTitleClick = () => {
    setSelectedCategory(null);
    setSelection({});
    setAnchorItem(null);
    setShowRandomOutfit(false);
    setShowSettings(false);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleSettingsBack = () => {
    setShowSettings(false);
  };

  if (loading) {
    return (
      <SettingsProvider>
        <ThemeProvider>
          <div className="min-h-screen bg-stone-50 dark:bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 dark:border-slate-200 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-300">Loading your wardrobe...</p>
            </div>
          </div>
        </ThemeProvider>
      </SettingsProvider>
    );
  }

  // Show settings page if requested
  if (showSettings) {
    return (
      <SettingsProvider>
        <ThemeProvider>
          <SettingsPage onBack={handleSettingsBack} />
        </ThemeProvider>
      </SettingsProvider>
    );
  }

  return (
    <SettingsProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-stone-50 dark:bg-slate-900 overflow-x-hidden">
      {/* Fixed Header Container */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-stone-50 dark:bg-slate-900">
        <TopBar
          onTitleClick={handleTitleClick}
          onSettingsClick={handleSettingsClick}
          weatherForecast={weatherForecast}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          onWeatherRetry={retryWeatherData}
        />

        <AnchorRow
          selectedCategory={selectedCategory}
          onCategorySelect={(category) => {
            // Reset selections when starting with a new category
            setSelection({});
            setAnchorItem(null);
            setSelectedCategory(category);
          }}
        />
      </div>

      {/* Content container with top padding to account for fixed header */}
      <div className="pt-[234px] md:pt-[210px] flex flex-col min-h-screen">
        <SelectionStrip
          selection={selection}
          anchorItem={anchorItem}
          onSelectionChange={handleSelectionChange}
          onOutfitSelect={handleOutfitSelect}
        />

        <div className="flex-1 flex min-h-0">
          {selectedCategory && itemsByCategory[selectedCategory] ? (
            <ItemsGrid
              category={selectedCategory}
              items={itemsByCategory[selectedCategory]}
              selectedItem={selection[selectedCategory.toLowerCase().replace('/', '') as keyof OutfitSelection] as WardrobeItem}
              onItemSelect={handleItemSelect}
            />
          ) : showRandomOutfit ? (
            <OutfitDisplay
              selection={selection}
              onRandomize={handleRandomize}
            />
          ) : anchorItem ? (
            // When an anchor item is selected, don't show "All Outfits" - let SelectionStrip handle it
            <div className="flex-1"></div>
          ) : (
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
              <div className="max-w-7xl mx-auto">
                <div className="mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-light text-slate-800 dark:text-slate-200">All Outfits</h2>
                    </div>
                    <button
                      onClick={handleRandomize}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors min-h-[44px] font-medium w-full sm:w-auto"
                    >
                      <Shuffle size={18} />
                      <span>Choose a Random Outfit</span>
                    </button>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">{getAllOutfits().length} combinations available</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {getAllOutfits().map(outfit => (
                    <OutfitCard
                      key={outfit.id}
                      outfit={outfit}
                      variant="compact"
                      showScore={true}
                      showSource={true}
                      onClick={() => handleOutfitSelect(outfit)}
                    />
                  ))}
                </div>
                {getAllOutfits().length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">No outfits available.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

        <ScrollToTop />
        </div>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export default App;
