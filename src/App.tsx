import { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { AnchorRow } from './components/AnchorRow';
import { SelectionStrip } from './components/SelectionStrip';
import { ItemsGrid } from './components/ItemsGrid';
import { OutfitDisplay } from './components/OutfitDisplay';
import { OutfitCard } from './components/OutfitCard';
import { useWardrobe } from './hooks/useWardrobe';
import { useOutfitEngine } from './hooks/useOutfitEngine';
import { Category, OutfitSelection, WardrobeItem, GeneratedOutfit, categoryToKey } from './types';

function App() {
  const { itemsByCategory, loading } = useWardrobe();
  const { generateRandomOutfit, getAllOutfits } = useOutfitEngine();
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selection, setSelection] = useState<OutfitSelection>({});
  const [anchorItem, setAnchorItem] = useState<WardrobeItem | null>(null);
  const [showRandomOutfit, setShowRandomOutfit] = useState(false);

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
    setShowRandomOutfit(false);
  };

  const handleShowOutfitsForItem = (item: WardrobeItem) => {
    // This function can be removed or simplified since we're not using modals
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
      tuck: outfit.tuck
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
        ) : showRandomOutfit ? (
          <OutfitDisplay 
            selection={selection}
            onRandomize={handleRandomize}
          />
        ) : anchorItem ? (
          // When an anchor item is selected, don't show "All Outfits" - let SelectionStrip handle it
          <div className="flex-1"></div>
        ) : (
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-slate-800 mb-2">All Outfits</h2>
                <p className="text-slate-600">{getAllOutfits().length} combinations available</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  <p className="text-slate-500">No outfits available.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

export default App;
