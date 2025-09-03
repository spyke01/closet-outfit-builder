import { useState, useEffect, useMemo } from 'react';
import { WardrobeItem, CuratedOutfit } from '../types';
import wardrobeData from '../data/wardrobe.json';
import outfitsData from '../data/outfits.json';

export const useWardrobe = () => {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<CuratedOutfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading from JSON files
    const loadData = async () => {
      try {
        setItems(wardrobeData.items as WardrobeItem[]);
        setOutfits(outfitsData.outfits as CuratedOutfit[]);
      } catch (error) {
        console.error('Failed to load wardrobe data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const itemsByCategory = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, WardrobeItem[]>);
  }, [items]);

  const getItemById = (id: string): WardrobeItem | undefined => {
    return items.find(item => item.id === id);
  };

  return {
    items,
    outfits,
    itemsByCategory,
    getItemById,
    loading
  };
};