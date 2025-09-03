import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useOutfitEngine } from './useOutfitEngine'
import { useWardrobe } from './useWardrobe'
import { WardrobeItem, OutfitSelection, GeneratedOutfit } from '../types'

// Mock the useWardrobe hook
vi.mock('./useWardrobe')

const mockItems: WardrobeItem[] = [
  { id: 'moto-jacket', name: 'Moto Jacket', category: 'Jacket/Overshirt', formalityScore: 3 },
  { id: 'grey-henley-knit', name: 'Grey Henley Knit', category: 'Shirt', formalityScore: 3 },
  { id: 'tee-cream', name: 'Cream Tee', category: 'Shirt', formalityScore: 2 },
  { id: 'tee-white', name: 'White Tee', category: 'Shirt', formalityScore: 2 },
  { id: 'tee-black', name: 'Black Tee', category: 'Shirt', formalityScore: 2 },
  { id: 'linen-black', name: 'Black Linen', category: 'Shirt', formalityScore: 4 },
  { id: 'denim-dark', name: 'Dark Denim', category: 'Pants', formalityScore: 4 },
  { id: 'chinos-black', name: 'Black Chinos', category: 'Pants', formalityScore: 6 },
  { id: 'apache-boots', name: 'Apache Boots', category: 'Shoes', formalityScore: 4 },
  { id: 'shorts-navy', name: 'Navy Shorts', category: 'Pants', formalityScore: 2 },
  // Add belt and watch items to make outfits complete
  { id: 'belt-rugged', name: 'Rugged Belt', category: 'Belt', formalityScore: 3 },
  { id: 'omega-speedmaster', name: 'Omega Speedmaster', category: 'Watch', formalityScore: 5 }
]

const mockOutfits = [
  {
    id: 'o-001',
    items: ['moto-jacket', 'grey-henley-knit', 'denim-dark', 'apache-boots', 'belt-rugged', 'omega-speedmaster'],
    tuck: 'Untucked' as const
  },
  {
    id: 'o-002', 
    items: ['moto-jacket', 'tee-cream', 'denim-dark', 'apache-boots', 'belt-rugged', 'omega-speedmaster'],
    tuck: 'Tucked' as const
  },
  {
    id: 'o-003',
    items: ['moto-jacket', 'tee-white', 'chinos-black', 'apache-boots', 'belt-rugged', 'omega-speedmaster'], 
    tuck: 'Tucked' as const
  },
  {
    id: 'o-004',
    items: ['moto-jacket', 'tee-black', 'chinos-black', 'apache-boots', 'belt-rugged', 'omega-speedmaster'],
    tuck: 'Tucked' as const
  },
  {
    id: 'o-005',
    items: ['moto-jacket', 'linen-black', 'denim-dark', 'apache-boots', 'belt-rugged', 'omega-speedmaster'],
    tuck: 'Untucked' as const
  }
]

const mockGetItemById = (id: string): WardrobeItem | undefined => {
  return mockItems.find(item => item.id === id)
}

describe('useOutfitEngine filtering methods', () => {
  beforeEach(() => {
    vi.mocked(useWardrobe).mockReturnValue({
      items: mockItems,
      outfits: mockOutfits,
      getItemById: mockGetItemById,
      categories: ['Jacket/Overshirt', 'Shirt', 'Pants', 'Shoes'],
      getItemsByCategory: vi.fn()
    })
  })

  describe('getCompatibleItems', () => {
    it('should return all items for a category when no selection is made', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const selection: OutfitSelection = {}
      
      const compatibleShirts = result.current.getCompatibleItems('Shirt', selection)
      
      // Should return all shirts that appear in any outfit
      expect(compatibleShirts).toHaveLength(5)
      expect(compatibleShirts.map(item => item.id)).toContain('grey-henley-knit')
      expect(compatibleShirts.map(item => item.id)).toContain('tee-cream')
      expect(compatibleShirts.map(item => item.id)).toContain('tee-white')
      expect(compatibleShirts.map(item => item.id)).toContain('tee-black')
      expect(compatibleShirts.map(item => item.id)).toContain('linen-black')
    })

    it('should filter items based on current selection - Requirement 2.1', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const motoJacket = mockGetItemById('moto-jacket')!
      const selection: OutfitSelection = { jacket: motoJacket }
      
      const compatibleShirts = result.current.getCompatibleItems('Shirt', selection)
      
      // Should only return shirts that appear in outfits with moto jacket
      expect(compatibleShirts).toHaveLength(5)
      expect(compatibleShirts.map(item => item.id)).toEqual(
        expect.arrayContaining(['grey-henley-knit', 'tee-cream', 'tee-white', 'tee-black', 'linen-black'])
      )
    })

    it('should progressively filter with multiple selections - Requirement 5.1, 5.2', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const motoJacket = mockGetItemById('moto-jacket')!
      const creamTee = mockGetItemById('tee-cream')!
      const selection: OutfitSelection = { 
        jacket: motoJacket,
        shirt: creamTee
      }
      
      const compatiblePants = result.current.getCompatibleItems('Pants', selection)
      const compatibleShoes = result.current.getCompatibleItems('Shoes', selection)
      
      // Should only return items that form valid outfits with both moto jacket and cream tee
      expect(compatiblePants).toHaveLength(1)
      expect(compatiblePants[0].id).toBe('denim-dark')
      
      expect(compatibleShoes).toHaveLength(1)
      expect(compatibleShoes[0].id).toBe('apache-boots')
    })

    it('should return empty array when no compatible items exist', () => {
      const { result } = renderHook(() => useOutfitEngine())
      // Create a selection that doesn't match any outfit
      const nonExistentItem: WardrobeItem = { 
        id: 'non-existent', 
        name: 'Non Existent', 
        category: 'Jacket/Overshirt',
        formalityScore: 1
      }
      const selection: OutfitSelection = { jacket: nonExistentItem }
      
      const compatibleShirts = result.current.getCompatibleItems('Shirt', selection)
      
      expect(compatibleShirts).toHaveLength(0)
    })

    it('should ignore tuck and locked properties in selection', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const motoJacket = mockGetItemById('moto-jacket')!
      const selection: OutfitSelection = { 
        jacket: motoJacket,
        tuck: 'Tucked',
        locked: new Set(['Jacket/Overshirt'])
      }
      
      const compatibleShirts = result.current.getCompatibleItems('Shirt', selection)
      
      // Should still return all shirts compatible with moto jacket
      expect(compatibleShirts).toHaveLength(5)
    })
  })

  describe('getFilteredOutfits', () => {
    it('should return all outfits when no selection is made', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const selection: OutfitSelection = {}
      
      const filteredOutfits = result.current.getFilteredOutfits(selection)
      
      expect(filteredOutfits).toHaveLength(5)
    })

    it('should filter outfits based on partial selection - Requirement 4.2', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const motoJacket = mockGetItemById('moto-jacket')!
      const selection: OutfitSelection = { jacket: motoJacket }
      
      const filteredOutfits = result.current.getFilteredOutfits(selection)
      
      // Should return all outfits containing moto jacket
      expect(filteredOutfits).toHaveLength(5)
      filteredOutfits.forEach(outfit => {
        expect(outfit.jacket?.id).toBe('moto-jacket')
      })
    })

    it('should filter outfits with multiple selections - Requirement 4.3', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const motoJacket = mockGetItemById('moto-jacket')!
      const darkDenim = mockGetItemById('denim-dark')!
      const selection: OutfitSelection = { 
        jacket: motoJacket,
        pants: darkDenim
      }
      
      const filteredOutfits = result.current.getFilteredOutfits(selection)
      
      // Should return outfits with both moto jacket and dark denim
      expect(filteredOutfits).toHaveLength(3)
      filteredOutfits.forEach(outfit => {
        expect(outfit.jacket?.id).toBe('moto-jacket')
        expect(outfit.pants?.id).toBe('denim-dark')
      })
    })

    it('should return empty array when no outfits match selection', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const nonExistentItem: WardrobeItem = { 
        id: 'non-existent', 
        name: 'Non Existent', 
        category: 'Jacket/Overshirt',
        formalityScore: 1
      }
      const selection: OutfitSelection = { jacket: nonExistentItem }
      
      const filteredOutfits = result.current.getFilteredOutfits(selection)
      
      expect(filteredOutfits).toHaveLength(0)
    })

    it('should ignore tuck and locked properties when filtering', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const motoJacket = mockGetItemById('moto-jacket')!
      const selection: OutfitSelection = { 
        jacket: motoJacket,
        tuck: 'Tucked',
        locked: new Set(['Jacket/Overshirt'])
      }
      
      const filteredOutfits = result.current.getFilteredOutfits(selection)
      
      // Should return all outfits with moto jacket regardless of tuck/locked
      expect(filteredOutfits).toHaveLength(5)
    })
  })

  describe('validatePartialSelection', () => {
    it('should return true for empty selection', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const selection: OutfitSelection = {}
      
      const isValid = result.current.validatePartialSelection(selection)
      
      expect(isValid).toBe(true)
    })

    it('should return true for valid partial selections', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const motoJacket = mockGetItemById('moto-jacket')!
      const darkDenim = mockGetItemById('dark-denim')!
      const selection: OutfitSelection = { 
        jacket: motoJacket,
        pants: darkDenim
      }
      
      const isValid = result.current.validatePartialSelection(selection)
      
      expect(isValid).toBe(true)
    })

    it('should return false for shorts + boots combination - Requirement 2.3', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const navyShorts = mockGetItemById('shorts-navy')!
      const apacheBoots = mockGetItemById('apache-boots')!
      const selection: OutfitSelection = { 
        pants: navyShorts,
        shoes: apacheBoots
      }
      
      const isValid = result.current.validatePartialSelection(selection)
      
      expect(isValid).toBe(false)
    })

    it('should return true when only shorts are selected (no boots)', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const navyShorts = mockGetItemById('shorts-navy')!
      const selection: OutfitSelection = { 
        pants: navyShorts
      }
      
      const isValid = result.current.validatePartialSelection(selection)
      
      expect(isValid).toBe(true)
    })

    it('should return true when only boots are selected (no shorts)', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const apacheBoots = mockGetItemById('apache-boots')!
      const selection: OutfitSelection = { 
        shoes: apacheBoots
      }
      
      const isValid = result.current.validatePartialSelection(selection)
      
      expect(isValid).toBe(true)
    })

    it('should ignore tuck and locked properties during validation', () => {
      const { result } = renderHook(() => useOutfitEngine())
      const selection: OutfitSelection = { 
        tuck: 'Tucked',
        locked: new Set(['Jacket/Overshirt'])
      }
      
      const isValid = result.current.validatePartialSelection(selection)
      
      expect(isValid).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    describe('getCompatibleItems error handling', () => {
      it('should return empty array for invalid category', () => {
        const { result } = renderHook(() => useOutfitEngine())
        const selection: OutfitSelection = {}
        
        const compatibleItems = result.current.getCompatibleItems('InvalidCategory' as Category, selection)
        
        expect(compatibleItems).toEqual([])
      })

      it('should return empty array for null selection', () => {
        const { result } = renderHook(() => useOutfitEngine())
        
        const compatibleItems = result.current.getCompatibleItems('Shirt', null as any)
        
        expect(compatibleItems).toEqual([])
      })

      it('should return empty array for undefined category', () => {
        const { result } = renderHook(() => useOutfitEngine())
        const selection: OutfitSelection = {}
        
        const compatibleItems = result.current.getCompatibleItems(undefined as any, selection)
        
        expect(compatibleItems).toEqual([])
      })

      it('should handle items with missing properties', () => {
        // Mock wardrobe with invalid items
        vi.mocked(useWardrobe).mockReturnValue({
          items: [
            { id: '', name: '', category: 'Shirt' } as WardrobeItem, // Invalid item
            mockItems[1] // Valid item
          ],
          outfits: mockOutfits,
          getItemById: mockGetItemById,
          categories: ['Jacket/Overshirt', 'Shirt', 'Pants', 'Shoes'],
          getItemsByCategory: vi.fn()
        })

        const { result } = renderHook(() => useOutfitEngine())
        const selection: OutfitSelection = {}
        
        const compatibleItems = result.current.getCompatibleItems('Shirt', selection)
        
        // Should filter out invalid items
        expect(compatibleItems.every(item => item.id && item.name)).toBe(true)
      })
    })

    describe('getFilteredOutfits error handling', () => {
      it('should return empty array for null selection', () => {
        const { result } = renderHook(() => useOutfitEngine())
        
        const filteredOutfits = result.current.getFilteredOutfits(null as any)
        
        expect(filteredOutfits).toEqual([])
      })

      it('should return empty array for undefined selection', () => {
        const { result } = renderHook(() => useOutfitEngine())
        
        const filteredOutfits = result.current.getFilteredOutfits(undefined as any)
        
        expect(filteredOutfits).toEqual([])
      })

      it('should handle empty outfits array', () => {
        // Mock wardrobe with no outfits
        vi.mocked(useWardrobe).mockReturnValue({
          items: mockItems,
          outfits: [],
          getItemById: mockGetItemById,
          categories: ['Jacket/Overshirt', 'Shirt', 'Pants', 'Shoes'],
          getItemsByCategory: vi.fn()
        })

        const { result } = renderHook(() => useOutfitEngine())
        const selection: OutfitSelection = {}
        
        const filteredOutfits = result.current.getFilteredOutfits(selection)
        
        expect(filteredOutfits).toEqual([])
      })
    })

    describe('validatePartialSelection error handling', () => {
      it('should return false for null selection', () => {
        const { result } = renderHook(() => useOutfitEngine())
        
        const isValid = result.current.validatePartialSelection(null as any)
        
        expect(isValid).toBe(false)
      })

      it('should return false for undefined selection', () => {
        const { result } = renderHook(() => useOutfitEngine())
        
        const isValid = result.current.validatePartialSelection(undefined as any)
        
        expect(isValid).toBe(false)
      })

      it('should return false for selection with invalid items', () => {
        const { result } = renderHook(() => useOutfitEngine())
        const selection: OutfitSelection = {
          shirt: { id: '', name: '', category: 'Shirt' } as WardrobeItem // Invalid item
        }
        
        const isValid = result.current.validatePartialSelection(selection)
        
        expect(isValid).toBe(false)
      })

      it('should return false for items with missing required properties', () => {
        const { result } = renderHook(() => useOutfitEngine())
        const selection: OutfitSelection = {
          shirt: { id: 'valid-id' } as WardrobeItem // Missing name and category
        }
        
        const isValid = result.current.validatePartialSelection(selection)
        
        expect(isValid).toBe(false)
      })

      it('should handle items with null properties', () => {
        const { result } = renderHook(() => useOutfitEngine())
        const selection: OutfitSelection = {
          pants: { id: 'shorts', name: null, category: 'Pants' } as any,
          shoes: { id: 'boots', name: null, category: 'Shoes' } as any
        }
        
        // Should not crash and should return false due to invalid items
        const isValid = result.current.validatePartialSelection(selection)
        
        expect(isValid).toBe(false)
      })
    })

    describe('Boundary conditions', () => {
      it('should handle extremely large selections', () => {
        const { result } = renderHook(() => useOutfitEngine())
        const largeSelection: OutfitSelection = {}
        
        // Add many properties to test performance
        for (let i = 0; i < 1000; i++) {
          (largeSelection as any)[`extraProp${i}`] = mockItems[0]
        }
        
        // Should not crash
        const isValid = result.current.validatePartialSelection(largeSelection)
        expect(typeof isValid).toBe('boolean')
      })

      it('should handle circular references gracefully', () => {
        const { result } = renderHook(() => useOutfitEngine())
        const circularItem: any = { id: 'circular', name: 'Circular', category: 'Shirt' }
        circularItem.self = circularItem // Create circular reference
        
        const selection: OutfitSelection = { shirt: circularItem }
        
        // Should not crash due to circular reference
        const isValid = result.current.validatePartialSelection(selection)
        expect(typeof isValid).toBe('boolean')
      })
    })
  })
})