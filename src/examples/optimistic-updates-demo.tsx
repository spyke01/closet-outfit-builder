/**
 * Demonstration of React 19 useOptimistic hooks implementation
 * This file shows how the optimistic updates work in practice
 */

import React, { useState } from 'react';
import { useOutfitEngine } from '../hooks/useOutfitEngine';
import { useOptimisticWeather } from '../hooks/useOptimisticWeather';
import { OptimisticWeatherWidget } from '../components/OptimisticWeatherWidget';
import { WardrobeItem } from '../types';

/**
 * Demo component showing optimistic outfit generation
 */
export const OptimisticOutfitDemo: React.FC = () => {
  const { generatedOutfits: outfits, isGenerating, generateOutfit, generationError } = useOutfitEngine();
  
  const sampleShirt: WardrobeItem = {
    id: 'demo-shirt',
    name: 'Demo Blue Shirt',
    category: 'Shirt',
    formality: 'Refined'
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Optimistic Outfit Generation Demo</h2>
      
      <button
        onClick={() => generateOutfit(sampleShirt)}
        disabled={isGenerating}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating Outfit...' : 'Generate Outfit'}
      </button>

      {generationError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {generationError.message}
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-semibold mb-2">Generated Outfits ({outfits.length}):</h3>
        {outfits.map((outfit) => (
          <div key={outfit.id} className="p-2 border rounded mb-2">
            <div className="text-sm">
              <strong>Score:</strong> {outfit.score}
            </div>
            <div className="text-sm">
              <strong>Source:</strong> {outfit.source}
            </div>
            {outfit.id.startsWith('optimistic-') && (
              <div className="text-xs text-blue-600 italic">
                ⚡ Optimistic update (immediate feedback)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Demo component showing optimistic weather updates
 */
export const OptimisticWeatherDemo: React.FC = () => {
  const [location, setLocation] = useState('New York, NY');
  const { weather, isUpdating, updateLocation, error } = useOptimisticWeather();

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    updateLocation(newLocation);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Optimistic Weather Updates Demo</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Location:</label>
        <select
          value={location}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="New York, NY">New York, NY</option>
          <option value="Miami, FL">Miami, FL</option>
          <option value="Seattle, WA">Seattle, WA</option>
          <option value="Phoenix, AZ">Phoenix, AZ</option>
          <option value="Chicago, IL">Chicago, IL</option>
        </select>
      </div>

      {isUpdating && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          ⚡ Updating weather (showing optimistic prediction)...
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error.message}
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-semibold mb-2">Weather Forecast:</h3>
        {weather.map((day, index) => (
          <div key={day.date} className="p-2 border rounded mb-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{day.dayOfWeek}</div>
                <div className="text-sm text-gray-600">{day.condition}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{day.high}°</div>
                <div className="text-sm text-gray-600">{day.low}°</div>
              </div>
            </div>
            {day.precipitationChance && day.precipitationChance > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                {day.precipitationChance}% chance of precipitation
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Demo component using the OptimisticWeatherWidget
 */
export const WeatherWidgetDemo: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState('Denver, CO');

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Optimistic Weather Widget Demo</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Location:</label>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="Denver, CO">Denver, CO</option>
          <option value="Portland, OR">Portland, OR</option>
          <option value="Boston, MA">Boston, MA</option>
          <option value="San Francisco, CA">San Francisco, CA</option>
        </select>
      </div>

      <div className="p-4 bg-gray-50 rounded">
        <OptimisticWeatherWidget 
          location={selectedLocation}
          className="text-sm"
          autoLoad={true}
        />
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <p>
          ⚡ This widget shows immediate weather predictions while fetching actual data.
          The optimistic updates provide instant feedback for better user experience.
        </p>
      </div>
    </div>
  );
};

/**
 * Main demo page combining all optimistic update examples
 */
export const OptimisticUpdatesDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          React 19 useOptimistic Hooks Demo
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <OptimisticOutfitDemo />
          <OptimisticWeatherDemo />
          <WeatherWidgetDemo />
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Implementation Features</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>Enhanced useOutfitEngine:</strong> Provides immediate outfit generation feedback with automatic error reversion</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>useOptimisticWeather:</strong> Shows instant weather predictions based on location while fetching actual data</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>createOptimisticOutfit:</strong> Generates immediate outfit previews for instant UI feedback</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>predictWeatherFromLocation:</strong> Creates location-based weather predictions for immediate display</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>Enhanced Components:</strong> OutfitDisplay and WeatherWidget updated with optimistic update support</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>Error Handling:</strong> Automatic reversion on failures with user-friendly error messages</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>Comprehensive Tests:</strong> Unit tests covering all optimistic update scenarios and edge cases</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OptimisticUpdatesDemo;