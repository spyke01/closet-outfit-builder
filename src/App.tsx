import { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { AnchorRow } from './components/AnchorRow';
import { SelectionStrip } from './components/SelectionStrip';
import { ItemsGrid } from './components/ItemsGrid';
import { OutfitDisplay } from './components/OutfitDisplay';
import { ResultsPanel } from './components/ResultsPanel';
import { useWardrobe } from './hooks/useWardrobe';
import { useOutfitEngine } from './hooks/useOutfitEngine';
import { Category, OutfitSelection, WardrobeItem, GeneratedOutfit, categoryToKey } from './types';

function App() {
  const { itemsByCategory, loading } = useWardrobe();
  const { generateRandomOutfit, getOutfitsForAnchor, getAllOutfits } = useOutfitEngine();
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selection, setSelection] = useState<OutfitSelection>({});
  const [showResults, setShowResults] = useState(false);
  const [anchorItem, setAnchorItem] = useState<WardrobeItem | null>(null);
  const [viewedItem, setViewedItem] = useState<WardrobeItem | null>(null);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
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
  };

  const handleShowOutfitsForItem = (item: WardrobeItem) => {
    // Set the viewed item for the modal, but don't set as anchor
    setViewedItem(item);
    setShowResults(true);
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
        tuck: randomOutfit.tuck
      });
    }
  };

  const handleShowAll = () => {
    // Show all outfits without setting a specific viewed item
    setViewedItem(null);
    setShowResults(true);
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
      tuck: outfit.tuck
    });
  };

  const handleTitleClick = () => {
    setSelectedCategory(null);
    setSelection({});
    setShowResults(false);
    setAnchorItem(null);
    setViewedItem(null);
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
        onTitleClick={handleTitleClick}
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
      
      <SelectionStrip 
        selection={selection}
        anchorItem={anchorItem}
        onSelectionChange={handleSelectionChange}
        onOutfitSelect={handleOutfitSelect}
      />

      <div className="flex-1 flex">
        {selectedCategory && itemsByCategory[selectedCategory] ? (
          <ItemsGrid
            category={selectedCategory}
            items={itemsByCategory[selectedCategory]}
            selectedItem={selection[selectedCategory.toLowerCase().replace('/', '') as keyof OutfitSelection] as WardrobeItem}
            onItemSelect={handleItemSelect}
            onShowOutfits={handleShowOutfitsForItem}
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
        onClose={() => {
          setShowResults(false);
          setViewedItem(null);
        }}
        outfits={viewedItem ? getOutfitsForAnchor(viewedItem) : getAllOutfits()}
        anchorItemName={viewedItem?.name}
      />
    </div>
  );
}

export default App;
