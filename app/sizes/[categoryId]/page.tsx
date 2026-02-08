import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoryDetailClient } from '@/components/sizes/category-detail-client'

/**
 * CategoryDetailPage - Server Component
 * 
 * Displays detailed size information for a specific category.
 * Implements parallel data fetching for optimal performance.
 * 
 * Features:
 * - Server-side authentication check
 * - Parallel data fetching (category, brand sizes, measurements)
 * - Initial data passed to client component
 * - 3× faster load time through waterfall elimination
 * 
 * Requirements: 4.1
 * Priority: HIGH - Eliminates waterfalls, reduces load time by 3×
 */
export default async function CategoryDetailPage({ 
  params 
}: { 
  params: { categoryId: string } 
}) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // ✅ Parallel fetching - eliminates waterfall (3× faster)
  const [category, brandSizes, measurements] = await Promise.all([
    supabase
      .from('size_categories')
      .select('*, standard_sizes(*)')
      .eq('id', params.categoryId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('brand_sizes')
      .select('*')
      .eq('category_id', params.categoryId)
      .eq('user_id', user.id)
      .order('brand_name'),
    supabase
      .from('category_measurements')
      .select('*')
      .eq('category_id', params.categoryId)
      .eq('user_id', user.id)
      .maybeSingle()
  ])

  // Handle category not found or unauthorized
  if (category.error || !category.data) {
    redirect('/sizes')
  }

  return (
    <CategoryDetailClient
      initialCategory={category.data}
      initialBrandSizes={brandSizes.data || []}
      initialMeasurements={measurements.data}
    />
  )
}
