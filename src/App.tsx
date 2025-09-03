import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { AnchorRow } from './components/AnchorRow';
import { SelectionStrip } from './components/SelectionStrip';
import { ItemsGrid } from './components/ItemsGrid';
import { OutfitDisplay } from './components/OutfitDisplay';
import { ResultsPanel } from './components/ResultsPanel';
import { useWardrobe } from './hooks/useWardrobe';
import { useOutfitEngine } from './hooks/useOutfitEngine';
import { Category, OutfitSelection, WardrobeItem } from './types';

function App() {
  const { itemsByCategory, loading } = useWardrobe();
  const { generateRandomOutfit, getOutfitsForAnchor, getAllOutfits } = useOutfitEngine();
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selection, setSelection] = useState<OutfitSelection>({ locked: new Set() });
  const [showResults, setShowResults] = useState(false);
  const [anchorItem, setAnchorItem] = useState<WardrobeItem | null>(null);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  const handleItemSelect = (item: WardrobeItem) => {
    const key = item.category.toLowerCase().replace('/', '') as keyof OutfitSelection;
    setSelection(prev => ({
      ...prev,
      [key]: item
    }));
    // After selecting an item, go back to outfit display
    setSelectedCategory(null);
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
        locked: selection.locked || new Set()
      });
    }
  };

  const handleShowAll = () => {
    // Use the first selected item as anchor
    const anchor = selection.jacket || selection.shirt || selection.pants || selection.shoes;
    if (anchor) {
      setAnchorItem(anchor);
      setShowResults(true);
    }
  };

  const handleSave = () => {
    const favorites = JSON.parse(localStorage.getItem('outfit-favorites') || '[]');
    const newFavorite = {
      id: `fav-${Date.now()}`,
      ...selection,
      savedAt: new Date().toISOString()
    };
    favorites.push(newFavorite);
    localStorage.setItem('outfit-favorites', JSON.stringify(favorites));
    alert('Outfit saved to favorites!');
  };

  const handleToggleLock = (category: Category) => {
    setSelection(prev => {
      const newLocked = new Set(prev.locked);
      if (newLocked.has(category)) {
        newLocked.delete(category);
      } else {
        newLocked.add(category);
      }
      return { ...prev, locked: newLocked };
    });
  };

  const handleClearSelection = (category: Category) => {
    const key = category.toLowerCase().replace('/', '') as keyof OutfitSelection;
    setSelection(prev => {
      const newLocked = new Set(prev.locked);
      newLocked.delete(category);
      return { 
        ...prev, 
        [key]: undefined,
        locked: newLocked
      };
    });
  };

  const handleTitleClick = () => {
    setSelectedCategory(null);
    setSelection({ locked: new Set() });
    setShowResults(false);
    setAnchorItem(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your wardrobe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <TopBar 
        onRandomize={handleRandomize}
        onShowAll={handleShowAll}
        onSave={handleSave}
        onTitleClick={handleTitleClick}
      />
      
      <AnchorRow 
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
      
      <SelectionStrip 
        selection={selection}
        onToggleLock={handleToggleLock}
        onClearSelection={handleClearSelection}
      />

      <div className="flex-1 flex">
        {selectedCategory && itemsByCategory[selectedCategory] ? (
          <ItemsGrid
            category={selectedCategory}
            items={itemsByCategory[selectedCategory]}
            selectedItem={selection[selectedCategory.toLowerCase().replace('/', '') as keyof OutfitSelection] as WardrobeItem}
            onItemSelect={handleItemSelect}
          />
        ) : (
          <OutfitDisplay 
            selection={selection}
            onRandomize={handleRandomize}
          />
        )}
      </div>

      <ResultsPanel
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        outfits={anchorItem ? getOutfitsForAnchor(anchorItem) : getAllOutfits()}
        anchorItemName={anchorItem?.name}
      />
    </div>
  );
}

export default App;
