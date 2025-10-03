import React from 'react';
import { AlertCircle, RefreshCw, Shirt, Shuffle } from 'lucide-react';
import { ErrorFallbackProps } from './EnhancedErrorBoundary';

export interface OutfitErrorFallbackProps extends ErrorFallbackProps {
  onShowAlternatives?: () => void;
  onTryDifferentAnchor?: () => void;
  hasAlternatives?: boolean;
}

export const OutfitErrorFallback: React.FC<OutfitErrorFallbackProps> = ({
  error,
  retry,
  retryCount,
  onShowAlternatives,
  onTryDifferentAnchor,
  hasAlternatives = false,
}) => {
  const getErrorMessage = (error: Error) => {
    if (error.message.includes('generation') || error.message.includes('outfit')) {
      return 'Unable to generate outfit combinations.';
    }
    if (error.message.includes('wardrobe') || error.message.includes('items')) {
      return 'Unable to load wardrobe items.';
    }
    if (error.message.includes('scoring') || error.message.includes('compatibility')) {
      return 'Unable to calculate outfit compatibility scores.';
    }
    return 'Outfit generation failed.';
  };

  const getSuggestion = (error: Error) => {
    if (error.message.includes('wardrobe')) {
      return 'Try refreshing the page to reload your wardrobe items.';
    }
    if (error.message.includes('generation')) {
      return 'Try selecting a different anchor item or use alternative suggestions.';
    }
    return 'You can try again or explore alternative outfit suggestions.';
  };

  return (
    <div 
      className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4"
      role="alert"
      data-testid="outfit-error-fallback"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Outfit generation failed
          </h3>
          <p className="text-red-600 dark:text-red-300 text-xs mb-2">
            {getErrorMessage(error)}
          </p>
          <p className="text-red-500 dark:text-red-400 text-xs mb-3">
            {getSuggestion(error)}
          </p>
          
          {retryCount > 0 && (
            <p className="text-red-500 dark:text-red-400 text-xs mb-2">
              Retry attempt {retryCount}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={retry}
              disabled={retryCount >= 3}
              className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded text-xs font-medium transition-colors disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry Generation
            </button>
            
            {hasAlternatives && (
              <button
                onClick={onShowAlternatives}
                className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
              >
                <Shirt className="w-3 h-3 mr-1" />
                Show Alternatives
              </button>
            )}
            
            <button
              onClick={onTryDifferentAnchor}
              className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
            >
              <Shuffle className="w-3 h-3 mr-1" />
              Try Different Item
            </button>
            
            <button
              onClick={() => {
                // Reset to default state
                const event = new CustomEvent('resetOutfitGeneration');
                window.dispatchEvent(event);
              }}
              className="inline-flex items-center px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs font-medium transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutfitErrorFallback;