import { OutfitFlatLayout } from '@/components/outfit-flat-layout';
import { OutfitVisualLayout } from '@/components/outfit-visual-layout';
import { WardrobeItem } from '@/lib/types/database';

// Mock data for demonstration
const mockItems: WardrobeItem[] = [
  {
    id: '1',
    user_id: 'user1',
    category_id: 'cat1',
    name: 'Navy Blue Blazer',
    brand: 'Hugo Boss',
    color: 'Navy Blue',
    formality_score: 9,
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat1',
      user_id: 'user1',
      name: 'Jacket',
      is_anchor_item: true,
      display_order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: '2',
    user_id: 'user1',
    category_id: 'cat2',
    name: 'White Dress Shirt',
    brand: 'Brooks Brothers',
    color: 'White',
    formality_score: 8,
    image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=300&fit=crop',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat2',
      user_id: 'user1',
      name: 'Shirt',
      is_anchor_item: false,
      display_order: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: '3',
    user_id: 'user1',
    category_id: 'cat3',
    name: 'Dark Wash Jeans',
    brand: 'Levi\'s',
    color: 'Dark Blue',
    formality_score: 5,
    image_url: undefined,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat3',
      user_id: 'user1',
      name: 'Pants',
      is_anchor_item: false,
      display_order: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: '4',
    user_id: 'user1',
    category_id: 'cat4',
    name: 'Brown Leather Oxfords',
    brand: 'Cole Haan',
    color: 'Brown',
    formality_score: 8,
    image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat4',
      user_id: 'user1',
      name: 'Shoes',
      is_anchor_item: false,
      display_order: 4,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
];

export default function TestFlatLayoutPage() {
  const handleRemoveItem = (itemId: string) => {
    console.log('Remove item:', itemId);
    alert(`Would remove item: ${itemId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Outfit Flat Layout Demo
        </h1>
        
        <div className="space-y-8">
          {/* Debug Info */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Debug Info</h3>
            <pre className="text-xs text-yellow-700 dark:text-yellow-300 overflow-auto">
              {JSON.stringify({
                totalItems: mockItems.length,
                itemsWithImages: mockItems.filter(item => item.image_url).length,
                categories: mockItems.map(item => item.category?.name),
                imageUrls: mockItems.map(item => item.image_url)
              }, null, 2)}
            </pre>
          </div>

          {/* Visual Layout - New Flat Layout */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Visual Flat Layout (New)
            </h2>
            <div className="flex justify-center">
              <OutfitVisualLayout
                items={mockItems}
                size="large"
              />
            </div>
          </div>

          {/* Different sizes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Different Sizes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className="text-sm font-medium mb-2">Small</h3>
                <OutfitVisualLayout items={mockItems} size="small" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium mb-2">Medium</h3>
                <OutfitVisualLayout items={mockItems} size="medium" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium mb-2">Large</h3>
                <OutfitVisualLayout items={mockItems} size="large" />
              </div>
            </div>
          </div>

          {/* Original Flat Layout for comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Original Flat Layout (Grid View)
            </h2>
            <OutfitFlatLayout
              items={mockItems}
              outfitScore={87}
              isEditable={false}
            />
          </div>

          {/* Editable view */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Editable Grid View
            </h2>
            <OutfitFlatLayout
              items={mockItems}
              outfitScore={87}
              isEditable={true}
              onRemoveItem={handleRemoveItem}
            />
          </div>

          {/* Empty state */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Empty State
            </h2>
            <div className="flex justify-center">
              <OutfitVisualLayout
                items={[]}
                size="medium"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}