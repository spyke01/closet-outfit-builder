/**
 * Migration Validation Utilities
 * 
 * Provides comprehensive validation for category split migration
 * Ensures data integrity and migration completeness
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    hasOldCategory: boolean;
    hasNewCategories: { jacket: boolean; overshirt: boolean };
    itemCounts: {
      oldCategory: number;
      jacket: number;
      overshirt: number;
      total: number;
    };
    categoryDisplayOrders: Record<string, number>;
  };
}

export interface MigrationValidationReport {
  overallValid: boolean;
  totalUsers: number;
  validUsers: number;
  invalidUsers: number;
  userResults: Array<{
    userId: string;
    validation: ValidationResult;
  }>;
  summary: {
    totalItemsInOldCategories: number;
    totalItemsInNewCategories: number;
    usersWithOldCategory: number;
    usersWithIncompleteCategories: number;
  };
}

export interface RollbackValidationResult {
  canRollback: boolean;
  errors: string[];
  warnings: string[];
  affectedUsers: string[];
  itemsToMove: number;
  categoriesToRemove: number;
}

/**
 * Migration Validator class for comprehensive validation
 */
export class MigrationValidator {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Validate migration completeness for a single user
   */
  async validateUserMigration(userId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      details: {
        hasOldCategory: false,
        hasNewCategories: { jacket: false, overshirt: false },
        itemCounts: {
          oldCategory: 0,
          jacket: 0,
          overshirt: 0,
          total: 0
        },
        categoryDisplayOrders: {}
      }
    };

    try {
      // Check for old category existence
      const { data: oldCategories, error: oldCatError } = await this.supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .eq('name', 'Jacket/Overshirt');

      if (oldCatError) {
        result.errors.push(`Failed to check old category: ${oldCatError.message}`);
        return result;
      }

      result.details.hasOldCategory = (oldCategories || []).length > 0;

      // If old category exists, count items in it
      if (result.details.hasOldCategory) {
        const oldCategoryId = oldCategories[0].id;
        const { data: oldItems, error: oldItemsError } = await this.supabase
          .from('wardrobe_items')
          .select('id')
          .eq('user_id', userId)
          .eq('category_id', oldCategoryId)
          .eq('active', true);

        if (oldItemsError) {
          result.errors.push(`Failed to count items in old category: ${oldItemsError.message}`);
        } else {
          result.details.itemCounts.oldCategory = (oldItems || []).length;
          if (result.details.itemCounts.oldCategory > 0) {
            result.errors.push(`${result.details.itemCounts.oldCategory} items still in old "Jacket/Overshirt" category`);
          }
        }
      }

      // Check for new categories
      const { data: newCategories, error: newCatError } = await this.supabase
        .from('categories')
        .select('id, name, display_order')
        .eq('user_id', userId)
        .in('name', ['Jacket', 'Overshirt']);

      if (newCatError) {
        result.errors.push(`Failed to check new categories: ${newCatError.message}`);
        return result;
      }

      const categoryMap = new Map((newCategories || []).map((cat: { name: string; id: string }) => [cat.name, cat]));
      
      result.details.hasNewCategories.jacket = categoryMap.has('Jacket');
      result.details.hasNewCategories.overshirt = categoryMap.has('Overshirt');

      if (!result.details.hasNewCategories.jacket) {
        result.errors.push('Missing "Jacket" category');
      }
      if (!result.details.hasNewCategories.overshirt) {
        result.errors.push('Missing "Overshirt" category');
      }

      // Count items in new categories and check display orders
      for (const [categoryName, category] of categoryMap) {
        const name = categoryName as string;
        const cat = category as any;
        result.details.categoryDisplayOrders[name] = cat.display_order;

        const { data: items, error: itemsError } = await this.supabase
          .from('wardrobe_items')
          .select('id')
          .eq('user_id', userId)
          .eq('category_id', cat.id)
          .eq('active', true);

        if (itemsError) {
          result.errors.push(`Failed to count items in ${name}: ${itemsError.message}`);
        } else {
          const count = (items || []).length;
          if (name === 'Jacket') {
            result.details.itemCounts.jacket = count;
          } else if (name === 'Overshirt') {
            result.details.itemCounts.overshirt = count;
          }
        }
      }

      result.details.itemCounts.total = 
        result.details.itemCounts.jacket + 
        result.details.itemCounts.overshirt + 
        result.details.itemCounts.oldCategory;

      // Validate display orders
      const expectedOrders = { 'Jacket': 1, 'Overshirt': 2 };
      for (const [categoryName, expectedOrder] of Object.entries(expectedOrders)) {
        const actualOrder = result.details.categoryDisplayOrders[categoryName];
        if (actualOrder !== undefined && actualOrder !== expectedOrder) {
          result.warnings.push(`${categoryName} category has display_order ${actualOrder}, expected ${expectedOrder}`);
        }
      }

      // Check for orphaned items (items without valid category references)
      const { data: orphanedItems, error: orphanError } = await this.supabase
        .from('wardrobe_items')
        .select(`
          id,
          category_id,
          categories!inner(id, name)
        `)
        .eq('user_id', userId)
        .eq('active', true)
        .is('categories.id', null);

      if (orphanError) {
        result.warnings.push(`Could not check for orphaned items: ${orphanError.message}`);
      } else if (orphanedItems && orphanedItems.length > 0) {
        result.errors.push(`${orphanedItems.length} items have invalid category references`);
      }

      // Migration is valid if:
      // 1. No old category exists
      // 2. Both new categories exist  
      // 3. No items in old category
      // 4. No validation errors
      result.isValid = 
        !result.details.hasOldCategory &&
        result.details.hasNewCategories.jacket &&
        result.details.hasNewCategories.overshirt &&
        result.details.itemCounts.oldCategory === 0 &&
        result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Validate migration for all users in the system
   */
  async validateAllUserMigrations(): Promise<MigrationValidationReport> {
    const report: MigrationValidationReport = {
      overallValid: false,
      totalUsers: 0,
      validUsers: 0,
      invalidUsers: 0,
      userResults: [],
      summary: {
        totalItemsInOldCategories: 0,
        totalItemsInNewCategories: 0,
        usersWithOldCategory: 0,
        usersWithIncompleteCategories: 0
      }
    };

    try {
      // Get all users who have any category (to find all users in the system)
      const { data: allUserCategories, error: usersError } = await this.supabase
        .from('categories')
        .select('user_id');

      if (usersError) {
        throw new Error(`Failed to get users: ${usersError.message}`);
      }

      const uniqueUsers = [...new Set((allUserCategories || []).map((uc: { user_id: string }) => uc.user_id))] as string[];
      report.totalUsers = uniqueUsers.length;

      // Validate each user
      for (const userId of uniqueUsers) {
        const userValidation = await this.validateUserMigration(userId);
        
        report.userResults.push({
          userId,
          validation: userValidation
        });

        if (userValidation.isValid) {
          report.validUsers++;
        } else {
          report.invalidUsers++;
        }

        // Update summary statistics
        if (userValidation.details.hasOldCategory) {
          report.summary.usersWithOldCategory++;
        }

        if (!userValidation.details.hasNewCategories.jacket || !userValidation.details.hasNewCategories.overshirt) {
          report.summary.usersWithIncompleteCategories++;
        }

        report.summary.totalItemsInOldCategories += userValidation.details.itemCounts.oldCategory;
        report.summary.totalItemsInNewCategories += 
          userValidation.details.itemCounts.jacket + userValidation.details.itemCounts.overshirt;
      }

      report.overallValid = report.invalidUsers === 0;

    } catch (error) {
      throw new Error(`Migration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return report;
  }

  /**
   * Validate if rollback is possible and safe
   */
  async validateRollbackPossibility(): Promise<RollbackValidationResult> {
    const result: RollbackValidationResult = {
      canRollback: false,
      errors: [],
      warnings: [],
      affectedUsers: [],
      itemsToMove: 0,
      categoriesToRemove: 0
    };

    try {
      // Find users who have the new categories
      const { data: newCategoryUsers, error: newCatError } = await this.supabase
        .from('categories')
        .select('user_id, name, id')
        .in('name', ['Jacket', 'Overshirt']);

      if (newCatError) {
        result.errors.push(`Failed to find users with new categories: ${newCatError.message}`);
        return result;
      }

      const userCategoryMap = new Map<string, { jacket?: string; overshirt?: string }>();
      
      for (const category of newCategoryUsers || []) {
        if (!userCategoryMap.has(category.user_id)) {
          userCategoryMap.set(category.user_id, {});
        }
        const userCategories = userCategoryMap.get(category.user_id)!;
        
        if (category.name === 'Jacket') {
          userCategories.jacket = category.id;
        } else if (category.name === 'Overshirt') {
          userCategories.overshirt = category.id;
        }
      }

      result.affectedUsers = Array.from(userCategoryMap.keys());
      result.categoriesToRemove = (newCategoryUsers || []).length;

      // Check if users already have "Jacket/Overshirt" category (would conflict)
      for (const userId of result.affectedUsers) {
        const { data: existingOldCat, error: oldCatError } = await this.supabase
          .from('categories')
          .select('id')
          .eq('user_id', userId)
          .eq('name', 'Jacket/Overshirt');

        if (oldCatError) {
          result.errors.push(`Failed to check existing old category for user ${userId}: ${oldCatError.message}`);
          continue;
        }

        if (existingOldCat && existingOldCat.length > 0) {
          result.errors.push(`User ${userId} already has "Jacket/Overshirt" category - rollback would create duplicate`);
        }
      }

      // Count items that would need to be moved
      for (const [userId, categories] of userCategoryMap) {
        const categoryIds = [categories.jacket, categories.overshirt].filter(Boolean);
        
        if (categoryIds.length > 0) {
          const { data: items, error: itemsError } = await this.supabase
            .from('wardrobe_items')
            .select('id')
            .eq('user_id', userId)
            .in('category_id', categoryIds)
            .eq('active', true);

          if (itemsError) {
            result.warnings.push(`Could not count items for user ${userId}: ${itemsError.message}`);
          } else {
            result.itemsToMove += (items || []).length;
          }
        }
      }

      // Check for any outfit references that might be affected
      const { data: outfitItems, error: outfitError } = await this.supabase
        .from('outfit_items')
        .select('outfit_id, item_id')
        .in('category_id', (newCategoryUsers || []).map((cat: { id: string }) => cat.id));

      if (outfitError) {
        result.warnings.push(`Could not check outfit references: ${outfitError.message}`);
      } else if (outfitItems && outfitItems.length > 0) {
        result.warnings.push(`${outfitItems.length} outfit items reference the new categories and will need category_id updates`);
      }

      // Rollback is possible if:
      // 1. There are users with new categories to rollback
      // 2. No users already have conflicting "Jacket/Overshirt" categories
      // 3. No critical errors
      result.canRollback = 
        result.affectedUsers.length > 0 &&
        result.errors.length === 0;

      if (result.affectedUsers.length === 0) {
        result.warnings.push('No users found with new categories - rollback not needed');
      }

    } catch (error) {
      result.errors.push(`Rollback validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Validate data integrity after migration or rollback
   */
  async validateDataIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    statistics: {
      totalUsers: number;
      totalCategories: number;
      totalItems: number;
      totalOutfits: number;
      orphanedItems: number;
      orphanedOutfitItems: number;
    };
  }> {
    const result = {
      isValid: false,
      errors: [] as string[],
      warnings: [] as string[],
      statistics: {
        totalUsers: 0,
        totalCategories: 0,
        totalItems: 0,
        totalOutfits: 0,
        orphanedItems: 0,
        orphanedOutfitItems: 0
      }
    };

    try {
      // Count total users
      const { data: users, error: usersError } = await this.supabase.auth.admin.listUsers();
      if (usersError) {
        result.warnings.push(`Could not count users: ${usersError.message}`);
      } else {
        result.statistics.totalUsers = users.users?.length || 0;
      }

      // Count categories
      const { data: categories, error: catError } = await this.supabase
        .from('categories')
        .select('id, user_id, name');

      if (catError) {
        result.errors.push(`Failed to fetch categories: ${catError.message}`);
      } else {
        result.statistics.totalCategories = (categories || []).length;
      }

      // Count wardrobe items
      const { data: items, error: itemsError } = await this.supabase
        .from('wardrobe_items')
        .select('id, user_id, category_id')
        .eq('active', true);

      if (itemsError) {
        result.errors.push(`Failed to fetch wardrobe items: ${itemsError.message}`);
      } else {
        result.statistics.totalItems = (items || []).length;

        // Check for orphaned items (items with invalid category references)
        const categoryIds = new Set((categories || []).map((cat: { id: string }) => cat.id));
        const orphanedItems = (items || []).filter((item: { category_id: string }) => !categoryIds.has(item.category_id));
        result.statistics.orphanedItems = orphanedItems.length;

        if (orphanedItems.length > 0) {
          result.errors.push(`${orphanedItems.length} wardrobe items have invalid category references`);
        }
      }

      // Count outfits and outfit items
      const { data: outfits, error: outfitsError } = await this.supabase
        .from('outfits')
        .select('id');

      if (outfitsError) {
        result.errors.push(`Failed to fetch outfits: ${outfitsError.message}`);
      } else {
        result.statistics.totalOutfits = (outfits || []).length;
      }

      // Check outfit items integrity
      const { data: outfitItems, error: outfitItemsError } = await this.supabase
        .from('outfit_items')
        .select('id, outfit_id, item_id, category_id');

      if (outfitItemsError) {
        result.errors.push(`Failed to fetch outfit items: ${outfitItemsError.message}`);
      } else {
        // Check for orphaned outfit items
        const itemIds = new Set((items || []).map((item: { id: string }) => item.id));
        const outfitIds = new Set((outfits || []).map((outfit: { id: string }) => outfit.id));
        const categoryIds = new Set((categories || []).map((cat: { id: string }) => cat.id));

        const orphanedOutfitItems = (outfitItems || []).filter((oi: { item_id: string; outfit_id: string; category_id: string }) => 
          !itemIds.has(oi.item_id) || 
          !outfitIds.has(oi.outfit_id) || 
          !categoryIds.has(oi.category_id)
        );

        result.statistics.orphanedOutfitItems = orphanedOutfitItems.length;

        if (orphanedOutfitItems.length > 0) {
          result.errors.push(`${orphanedOutfitItems.length} outfit items have invalid references`);
        }
      }

      // Data integrity is valid if no errors found
      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Data integrity validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }
}

/**
 * Utility function to create a migration validator instance
 */
export function createMigrationValidator(supabaseUrl: string, serviceRoleKey: string): MigrationValidator {
  return new MigrationValidator(supabaseUrl, serviceRoleKey);
}

/**
 * Utility function to format validation results for logging
 */
export function formatValidationReport(report: MigrationValidationReport): string {
  const lines = [
    '📊 Migration Validation Report',
    '================================',
    `Overall Status: ${report.overallValid ? '✅ VALID' : '❌ INVALID'}`,
    `Total Users: ${report.totalUsers}`,
    `Valid Users: ${report.validUsers}`,
    `Invalid Users: ${report.invalidUsers}`,
    '',
    '📈 Summary Statistics:',
    `- Users with old category: ${report.summary.usersWithOldCategory}`,
    `- Users with incomplete categories: ${report.summary.usersWithIncompleteCategories}`,
    `- Items in old categories: ${report.summary.totalItemsInOldCategories}`,
    `- Items in new categories: ${report.summary.totalItemsInNewCategories}`,
    ''
  ];

  if (report.invalidUsers > 0) {
    lines.push('❌ Invalid Users:');
    for (const userResult of report.userResults) {
      if (!userResult.validation.isValid) {
        lines.push(`  User ${userResult.userId}:`);
        for (const error of userResult.validation.errors) {
          lines.push(`    - ${error}`);
        }
        if (userResult.validation.warnings.length > 0) {
          lines.push(`    Warnings:`);
          for (const warning of userResult.validation.warnings) {
            lines.push(`      - ${warning}`);
          }
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * Utility function to format rollback validation results
 */
export function formatRollbackValidation(result: RollbackValidationResult): string {
  const lines = [
    '🔄 Rollback Validation Report',
    '==============================',
    `Can Rollback: ${result.canRollback ? '✅ YES' : '❌ NO'}`,
    `Affected Users: ${result.affectedUsers.length}`,
    `Items to Move: ${result.itemsToMove}`,
    `Categories to Remove: ${result.categoriesToRemove}`,
    ''
  ];

  if (result.errors.length > 0) {
    lines.push('❌ Errors:');
    for (const error of result.errors) {
      lines.push(`  - ${error}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('⚠️ Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}