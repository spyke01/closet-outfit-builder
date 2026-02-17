#!/usr/bin/env node

/**
 * Category Split Migration Script
 * 
 * Migrates the existing "Jacket/Overshirt" category into separate "Jacket" and "Overshirt" categories
 * Automatically classifies existing items based on their characteristics
 * Provides validation and rollback functionality
 */

import { config } from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

/**
 * Simple item classifier for migration purposes
 */
class SimpleItemClassifier {
  classifyItem(item) {
    const name = item.name?.toLowerCase() || '';
    const formalityScore = item.formality_score || 0;
    
    // Jacket rules (higher priority)
    if (/\b(coat|blazer|sportcoat|pea coat|trench|mac coat)\b/i.test(name)) {
      return 'Jacket';
    }
    
    if (/\b(moto jacket|leather jacket|bomber|gilet|vest)\b/i.test(name)) {
      return 'Jacket';
    }
    
    if (formalityScore >= 7 && /jacket/i.test(name)) {
      return 'Jacket';
    }
    
    if (/\b(suit jacket|dinner jacket|tuxedo|smoking jacket)\b/i.test(name)) {
      return 'Jacket';
    }
    
    // Overshirt rules (lower priority)
    if (/\b(cardigan|sweater|knit|pullover|hoodie|sweatshirt)\b/i.test(name)) {
      return 'Overshirt';
    }
    
    if (/\b(shacket|overshirt|shirt jacket|flannel|chambray)\b/i.test(name)) {
      return 'Overshirt';
    }
    
    if (formalityScore <= 6 && /\b(layer|light|casual)\b/i.test(name)) {
      return 'Overshirt';
    }
    
    if (formalityScore <= 5) {
      return 'Overshirt';
    }
    
    // Default fallback
    return 'Overshirt';
  }
}

/**
 * Simple migration validator
 */
class SimpleMigrationValidator {
  constructor(supabase) {
    this.supabase = supabase;
  }
  
  async validateMigration() {
    const errors = [];
    const warnings = [];
    
    // Check for remaining old categories
    const { data: oldCategories, error: oldCatError } = await this.supabase
      .from('categories')
      .select('*')
      .eq('name', 'Jacket/Overshirt');
      
    if (oldCatError) {
      errors.push(`Failed to check old categories: ${oldCatError.message}`);
    } else if (oldCategories && oldCategories.length > 0) {
      errors.push(`${oldCategories.length} "Jacket/Overshirt" categories still exist`);
    }
    
    // Check for orphaned items
    const { data: categories, error: catError } = await this.supabase
      .from('categories')
      .select('id');
      
    if (catError) {
      errors.push(`Failed to fetch categories: ${catError.message}`);
    } else {
      const categoryIds = categories.map(cat => cat.id);
      
      const { data: orphanedItems, error: itemError } = await this.supabase
        .from('wardrobe_items')
        .select('id, category_id')
        .eq('active', true)
        .not('category_id', 'in', `(${categoryIds.join(',')})`);
        
      if (itemError) {
        warnings.push(`Could not check for orphaned items: ${itemError.message}`);
      } else if (orphanedItems && orphanedItems.length > 0) {
        errors.push(`${orphanedItems.length} items have invalid category references`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        oldCategoriesRemaining: oldCategories?.length || 0
      }
    };
  }
}

/**
 * Secure logging utility that prevents sensitive data exposure
 */
class SecureLogger {
  constructor(verbose = false) {
    this.verbose = verbose;
    this.sensitivePatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}\b/g, // UUIDs
    ];
  }

  sanitize(message) {
    if (typeof message !== 'string') {
      if (message === null || message === undefined) {
        return String(message);
      }
      message = JSON.stringify(message, null, 2);
    }

    let sanitized = message;
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return sanitized;
  }

  info(message, ...args) {
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] INFO:`, this.sanitize(message), ...args.map(arg => this.sanitize(arg)));
  }

  error(message, details = {}) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR:`, this.sanitize(message));
    if (Object.keys(details).length > 0) {
      console.error('Details:', this.sanitize(JSON.stringify(details, null, 2)));
    }
  }

  warn(message, ...args) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN:`, this.sanitize(message), ...args.map(arg => this.sanitize(arg)));
  }

  debug(message, ...args) {
    if (this.verbose) {
      const timestamp = new Date().toISOString();
      console.info(`[${timestamp}] DEBUG:`, this.sanitize(message), ...args.map(arg => this.sanitize(arg)));
    }
  }

  success(message, ...args) {
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] ✅ SUCCESS:`, this.sanitize(message), ...args.map(arg => this.sanitize(arg)));
  }
}

/**
 * Custom error classes for different error categories
 */
class MigrationError extends Error {
  constructor(message, category, details = {}) {
    super(message);
    this.name = 'MigrationError';
    this.category = category;
    this.details = details;
  }
}

class ConfigurationError extends MigrationError {
  constructor(message, details = {}) {
    super(message, 'CONFIGURATION', details);
    this.name = 'ConfigurationError';
  }
}

class ValidationError extends MigrationError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION', details);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends MigrationError {
  constructor(message, details = {}) {
    super(message, 'DATABASE', details);
    this.name = 'DatabaseError';
  }
}

/**
 * Environment validation utility
 */
function validateEnvironment(logger) {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new ConfigurationError(
      'Missing required environment variables',
      { missingVars: missing }
    );
  }

  logger.debug('Environment validation passed');
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

/**
 * Command-line argument configuration
 */
function parseArguments() {
  return yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('dry-run', {
      type: 'boolean',
      default: false,
      description: 'Validate migration without making database changes'
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      default: false,
      description: 'Enable detailed logging'
    })
    .option('validate', {
      type: 'boolean',
      default: false,
      description: 'Validate migration status without making changes'
    })
    .option('rollback', {
      type: 'boolean',
      default: false,
      description: 'Rollback the migration (restore Jacket/Overshirt category)'
    })
    .help('h')
    .alias('h', 'help')
    .example('$0', 'Run the category split migration')
    .example('$0 --dry-run', 'Test the migration without making changes')
    .example('$0 --validate', 'Validate current migration status')
    .example('$0 --rollback', 'Rollback the migration')
    .argv;
}

/**
 * Category Migration class for handling the split operation
 */
class CategoryMigration {
  constructor(supabaseUrl, serviceRoleKey, logger) {
    this.logger = logger;
    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    this.classifier = new SimpleItemClassifier();
    this.logger.debug('CategoryMigration initialized');
  }

  /**
   * Get all users who have the "Jacket/Overshirt" category
   */
  async getUsersWithOldCategory() {
    try {
      this.logger.debug('Finding users with "Jacket/Overshirt" category');

      const { data: categories, error } = await this.supabase
        .from('categories')
        .select('user_id, id, name')
        .eq('name', 'Jacket/Overshirt');

      if (error) {
        throw new DatabaseError(
          `Failed to fetch users with old category: ${error.message}`,
          { error }
        );
      }

      const users = categories || [];
      this.logger.debug(`Found ${users.length} users with "Jacket/Overshirt" category`);
      return users;

    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to get users with old category: ${error.message}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Create new "Jacket" and "Overshirt" categories for a user
   */
  async createNewCategoriesForUser(userId) {
    try {
      this.logger.debug(`Creating new categories for user: ${userId}`);

      // Check if categories already exist
      const { data: existingCategories, error: checkError } = await this.supabase
        .from('categories')
        .select('name')
        .eq('user_id', userId)
        .in('name', ['Jacket', 'Overshirt']);

      if (checkError) {
        throw new DatabaseError(
          `Failed to check existing categories: ${checkError.message}`,
          { userId, error: checkError }
        );
      }

      const existingNames = new Set((existingCategories || []).map(cat => cat.name));
      const categoriesToCreate = [];

      if (!existingNames.has('Jacket')) {
        categoriesToCreate.push({
          user_id: userId,
          name: 'Jacket',
          is_anchor_item: true,
          display_order: 1
        });
      }

      if (!existingNames.has('Overshirt')) {
        categoriesToCreate.push({
          user_id: userId,
          name: 'Overshirt',
          is_anchor_item: true,
          display_order: 2
        });
      }

      if (categoriesToCreate.length === 0) {
        this.logger.debug(`Categories already exist for user ${userId}`);
        return { created: [], existing: existingCategories };
      }

      const { data: createdCategories, error: createError } = await this.supabase
        .from('categories')
        .insert(categoriesToCreate)
        .select('id, name, is_anchor_item, display_order');

      if (createError) {
        throw new DatabaseError(
          `Failed to create new categories: ${createError.message}`,
          { userId, categoriesToCreate, error: createError }
        );
      }

      this.logger.debug(`Created ${createdCategories?.length || 0} new categories for user ${userId}`);
      return { created: createdCategories || [], existing: existingCategories || [] };

    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to create new categories for user: ${error.message}`,
        { userId, originalError: error.message }
      );
    }
  }

  /**
   * Get wardrobe items for a user that belong to the old category
   */
  async getItemsToMigrate(userId, oldCategoryId) {
    try {
      this.logger.debug(`Getting items to migrate for user: ${userId}`);

      const { data: items, error } = await this.supabase
        .from('wardrobe_items')
        .select('id, name, brand, color, formality_score, capsule_tags, season, image_url, active, external_id')
        .eq('user_id', userId)
        .eq('category_id', oldCategoryId)
        .eq('active', true);

      if (error) {
        throw new DatabaseError(
          `Failed to fetch items to migrate: ${error.message}`,
          { userId, oldCategoryId, error }
        );
      }

      this.logger.debug(`Found ${items?.length || 0} items to migrate for user ${userId}`);
      return items || [];

    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to get items to migrate: ${error.message}`,
        { userId, oldCategoryId, originalError: error.message }
      );
    }
  }

  /**
   * Classify and migrate items to new categories
   */
  async migrateItemsForUser(userId, items, newCategories) {
    try {
      this.logger.debug(`Migrating ${items.length} items for user: ${userId}`);

      // Create category mapping
      const categoryMap = {};
      newCategories.forEach(cat => {
        categoryMap[cat.name] = cat.id;
      });

      const migrationResults = {
        jacketItems: [],
        overshirtItems: [],
        classifications: [],
        errors: []
      };

      // Classify each item
      for (const item of items) {
        try {
          const classification = this.classifier.classifyItem(item);
          const reason = `Classified as ${classification} based on item characteristics`;
          const newCategoryId = categoryMap[classification];

          if (!newCategoryId) {
            migrationResults.errors.push({
              itemId: item.id,
              error: `No category ID found for classification: ${classification}`
            });
            continue;
          }

          // Update the item's category
          const { error: updateError } = await this.supabase
            .from('wardrobe_items')
            .update({ category_id: newCategoryId })
            .eq('id', item.id);

          if (updateError) {
            migrationResults.errors.push({
              itemId: item.id,
              error: `Failed to update item category: ${updateError.message}`
            });
            continue;
          }

          // Record the classification
          const classificationRecord = {
            itemId: item.id,
            itemName: item.name,
            originalCategory: 'Jacket/Overshirt',
            newCategory: classification,
            reason: reason
          };

          migrationResults.classifications.push(classificationRecord);

          if (classification === 'Jacket') {
            migrationResults.jacketItems.push(item);
          } else {
            migrationResults.overshirtItems.push(item);
          }

        } catch (classificationError) {
          migrationResults.errors.push({
            itemId: item.id,
            error: `Classification failed: ${classificationError.message}`
          });
        }
      }

      this.logger.debug(`Migration complete for user ${userId}: ${migrationResults.jacketItems.length} jackets, ${migrationResults.overshirtItems.length} overshirts, ${migrationResults.errors.length} errors`);
      return migrationResults;

    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to migrate items for user: ${error.message}`,
        { userId, itemCount: items.length, originalError: error.message }
      );
    }
  }

  /**
   * Remove the old "Jacket/Overshirt" category for a user
   */
  async removeOldCategory(userId, oldCategoryId) {
    try {
      this.logger.debug(`Removing old category for user: ${userId}`);

      // First check if there are any remaining items in the old category
      const { data: remainingItems, error: checkError } = await this.supabase
        .from('wardrobe_items')
        .select('id')
        .eq('user_id', userId)
        .eq('category_id', oldCategoryId)
        .eq('active', true);

      if (checkError) {
        throw new DatabaseError(
          `Failed to check for remaining items: ${checkError.message}`,
          { userId, oldCategoryId, error: checkError }
        );
      }

      if (remainingItems && remainingItems.length > 0) {
        throw new ValidationError(
          `Cannot remove old category: ${remainingItems.length} items still reference it`,
          { userId, oldCategoryId, remainingItems: remainingItems.length }
        );
      }

      // Remove the old category
      const { error: deleteError } = await this.supabase
        .from('categories')
        .delete()
        .eq('id', oldCategoryId)
        .eq('user_id', userId);

      if (deleteError) {
        throw new DatabaseError(
          `Failed to delete old category: ${deleteError.message}`,
          { userId, oldCategoryId, error: deleteError }
        );
      }

      this.logger.debug(`Successfully removed old category for user ${userId}`);

    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to remove old category: ${error.message}`,
        { userId, oldCategoryId, originalError: error.message }
      );
    }
  }

  /**
   * Update display_order for remaining categories
   */
  async updateDisplayOrder(userId) {
    try {
      this.logger.debug(`Updating display order for user: ${userId}`);

      // Get all categories for the user
      const { data: categories, error: fetchError } = await this.supabase
        .from('categories')
        .select('id, name, display_order')
        .eq('user_id', userId)
        .order('display_order');

      if (fetchError) {
        throw new DatabaseError(
          `Failed to fetch categories for display order update: ${fetchError.message}`,
          { userId, error: fetchError }
        );
      }

      // Define the desired order
      const desiredOrder = {
        'Jacket': 1,
        'Overshirt': 2,
        'Shirt': 3,
        'Pants': 4,
        'Shoes': 5,
        'Belt': 6,
        'Watch': 7,
        'Undershirt': 8
      };

      // Update categories that need new display orders
      const updates = [];
      for (const category of categories || []) {
        const newOrder = desiredOrder[category.name];
        if (newOrder && newOrder !== category.display_order) {
          updates.push({
            id: category.id,
            display_order: newOrder
          });
        }
      }

      if (updates.length === 0) {
        this.logger.debug(`No display order updates needed for user ${userId}`);
        return;
      }

      // Perform updates
      for (const update of updates) {
        const { error: updateError } = await this.supabase
          .from('categories')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (updateError) {
          throw new DatabaseError(
            `Failed to update display order: ${updateError.message}`,
            { userId, categoryId: update.id, error: updateError }
          );
        }
      }

      this.logger.debug(`Updated display order for ${updates.length} categories for user ${userId}`);

    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to update display order: ${error.message}`,
        { userId, originalError: error.message }
      );
    }
  }

  /**
   * Validate migration completeness for a user
   */
  async validateMigration(userId) {
    try {
      this.logger.debug(`Validating migration for user: ${userId}`);

      const validationResult = {
        hasOldCategory: false,
        hasNewCategories: { jacket: false, overshirt: false },
        itemsInOldCategory: 0,
        itemsInNewCategories: { jacket: 0, overshirt: 0 },
        isValid: false,
        errors: []
      };

      // Check for old category
      const { data: oldCategories, error: oldCatError } = await this.supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .eq('name', 'Jacket/Overshirt');

      if (oldCatError) {
        validationResult.errors.push(`Failed to check old category: ${oldCatError.message}`);
      } else {
        validationResult.hasOldCategory = (oldCategories || []).length > 0;
        if (validationResult.hasOldCategory) {
          validationResult.errors.push('Old "Jacket/Overshirt" category still exists');
        }
      }

      // Check for new categories
      const { data: newCategories, error: newCatError } = await this.supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .in('name', ['Jacket', 'Overshirt']);

      if (newCatError) {
        validationResult.errors.push(`Failed to check new categories: ${newCatError.message}`);
      } else {
        const categoryNames = new Set((newCategories || []).map(cat => cat.name));
        validationResult.hasNewCategories.jacket = categoryNames.has('Jacket');
        validationResult.hasNewCategories.overshirt = categoryNames.has('Overshirt');

        if (!validationResult.hasNewCategories.jacket) {
          validationResult.errors.push('Missing "Jacket" category');
        }
        if (!validationResult.hasNewCategories.overshirt) {
          validationResult.errors.push('Missing "Overshirt" category');
        }
      }

      // Check item counts in new categories
      if (newCategories && newCategories.length > 0) {
        for (const category of newCategories) {
          const { data: items, error: itemsError } = await this.supabase
            .from('wardrobe_items')
            .select('id')
            .eq('user_id', userId)
            .eq('category_id', category.id)
            .eq('active', true);

          if (itemsError) {
            validationResult.errors.push(`Failed to count items in ${category.name}: ${itemsError.message}`);
          } else {
            const count = (items || []).length;
            if (category.name === 'Jacket') {
              validationResult.itemsInNewCategories.jacket = count;
            } else if (category.name === 'Overshirt') {
              validationResult.itemsInNewCategories.overshirt = count;
            }
          }
        }
      }

      // Migration is valid if:
      // 1. No old category exists
      // 2. Both new categories exist
      // 3. No validation errors
      validationResult.isValid = 
        !validationResult.hasOldCategory &&
        validationResult.hasNewCategories.jacket &&
        validationResult.hasNewCategories.overshirt &&
        validationResult.errors.length === 0;

      this.logger.debug(`Migration validation for user ${userId}: ${validationResult.isValid ? 'VALID' : 'INVALID'}`);
      return validationResult;

    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to validate migration: ${error.message}`,
        { userId, originalError: error.message }
      );
    }
  }

  /**
   * Perform complete migration for a single user
   */
  async migrateUser(userId, oldCategoryId, dryRun = false) {
    try {
      this.logger.info(`${dryRun ? '[DRY RUN] ' : ''}Starting migration for user: ${userId}`);

      const migrationResult = {
        userId,
        success: false,
        steps: {
          createCategories: false,
          migrateItems: false,
          removeOldCategory: false,
          updateDisplayOrder: false,
          validation: false
        },
        itemsMigrated: {
          jacket: 0,
          overshirt: 0,
          total: 0
        },
        classifications: [],
        errors: []
      };

      try {
        // Step 1: Create new categories
        this.logger.debug(`${dryRun ? '[DRY RUN] ' : ''}Step 1: Creating new categories`);
        if (!dryRun) {
          const categoryResult = await this.createNewCategoriesForUser(userId);
          migrationResult.steps.createCategories = true;
          
          // Get all categories for this user (existing + newly created)
          const { data: allCategories, error: allCatError } = await this.supabase
            .from('categories')
            .select('id, name')
            .eq('user_id', userId)
            .in('name', ['Jacket', 'Overshirt']);

          if (allCatError) {
            throw new DatabaseError(`Failed to fetch new categories: ${allCatError.message}`);
          }

          var newCategories = allCategories || [];
        } else {
          this.logger.info('[DRY RUN] Would create "Jacket" and "Overshirt" categories');
          migrationResult.steps.createCategories = true;
          var newCategories = [
            { id: 'dry-run-jacket-id', name: 'Jacket' },
            { id: 'dry-run-overshirt-id', name: 'Overshirt' }
          ];
        }

        // Step 2: Get and migrate items
        this.logger.debug(`${dryRun ? '[DRY RUN] ' : ''}Step 2: Migrating items`);
        const items = await this.getItemsToMigrate(userId, oldCategoryId);
        
        if (items.length === 0) {
          this.logger.info(`No items to migrate for user ${userId}`);
          migrationResult.steps.migrateItems = true;
        } else {
          if (!dryRun) {
            const itemResults = await this.migrateItemsForUser(userId, items, newCategories);
            migrationResult.itemsMigrated.jacket = itemResults.jacketItems.length;
            migrationResult.itemsMigrated.overshirt = itemResults.overshirtItems.length;
            migrationResult.itemsMigrated.total = items.length;
            migrationResult.classifications = itemResults.classifications;
            migrationResult.errors.push(...itemResults.errors);
            migrationResult.steps.migrateItems = itemResults.errors.length === 0;
          } else {
            // Dry run: just classify items without updating database
            for (const item of items) {
              const classification = this.classifier.classifyItem(item);
              const reason = `Classified as ${classification} based on item characteristics`;
              
              migrationResult.classifications.push({
                itemId: item.id,
                itemName: item.name,
                originalCategory: 'Jacket/Overshirt',
                newCategory: classification,
                reason: reason
              });

              if (classification === 'Jacket') {
                migrationResult.itemsMigrated.jacket++;
              } else {
                migrationResult.itemsMigrated.overshirt++;
              }
            }
            migrationResult.itemsMigrated.total = items.length;
            migrationResult.steps.migrateItems = true;
            this.logger.info(`[DRY RUN] Would migrate ${items.length} items: ${migrationResult.itemsMigrated.jacket} to Jacket, ${migrationResult.itemsMigrated.overshirt} to Overshirt`);
          }
        }

        // Step 3: Remove old category
        this.logger.debug(`${dryRun ? '[DRY RUN] ' : ''}Step 3: Removing old category`);
        if (!dryRun) {
          await this.removeOldCategory(userId, oldCategoryId);
          migrationResult.steps.removeOldCategory = true;
        } else {
          this.logger.info('[DRY RUN] Would remove "Jacket/Overshirt" category');
          migrationResult.steps.removeOldCategory = true;
        }

        // Step 4: Update display order
        this.logger.debug(`${dryRun ? '[DRY RUN] ' : ''}Step 4: Updating display order`);
        if (!dryRun) {
          await this.updateDisplayOrder(userId);
          migrationResult.steps.updateDisplayOrder = true;
        } else {
          this.logger.info('[DRY RUN] Would update category display order');
          migrationResult.steps.updateDisplayOrder = true;
        }

        // Step 5: Validation
        this.logger.debug(`${dryRun ? '[DRY RUN] ' : ''}Step 5: Validating migration`);
        if (!dryRun) {
          const validation = await this.validateMigration(userId);
          migrationResult.steps.validation = validation.isValid;
          if (!validation.isValid) {
            migrationResult.errors.push(...validation.errors);
          }
        } else {
          this.logger.info('[DRY RUN] Would validate migration completeness');
          migrationResult.steps.validation = true;
        }

        // Check overall success
        migrationResult.success = Object.values(migrationResult.steps).every(step => step === true);

        if (migrationResult.success) {
          this.logger.success(`${dryRun ? '[DRY RUN] ' : ''}Migration completed successfully for user ${userId}`);
        } else {
          this.logger.error(`${dryRun ? '[DRY RUN] ' : ''}Migration failed for user ${userId}`);
        }

        return migrationResult;

      } catch (stepError) {
        migrationResult.errors.push(stepError.message);
        migrationResult.success = false;
        throw stepError;
      }

    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to migrate user: ${error.message}`,
        { userId, originalError: error.message }
      );
    }
  }

  /**
   * Rollback migration by recreating "Jacket/Overshirt" category and moving items back
   */
  async rollbackMigration(dryRun = false) {
    try {
      this.logger.info(`${dryRun ? '[DRY RUN] ' : ''}Starting migration rollback`);

      // Get all users who have the new categories
      const { data: users, error: usersError } = await this.supabase
        .from('categories')
        .select('user_id')
        .in('name', ['Jacket', 'Overshirt'])
        .group('user_id');

      if (usersError) {
        throw new DatabaseError(
          `Failed to get users for rollback: ${usersError.message}`,
          { error: usersError }
        );
      }

      const uniqueUsers = [...new Set((users || []).map(u => u.user_id))];
      this.logger.info(`Found ${uniqueUsers.length} users to rollback`);

      const rollbackResults = {
        totalUsers: uniqueUsers.length,
        successfulUsers: 0,
        failedUsers: 0,
        errors: []
      };

      for (const userId of uniqueUsers) {
        try {
          this.logger.info(`${dryRun ? '[DRY RUN] ' : ''}Rolling back user: ${userId}`);

          if (!dryRun) {
            // Create "Jacket/Overshirt" category
            const { data: newCategory, error: createError } = await this.supabase
              .from('categories')
              .insert([{
                user_id: userId,
                name: 'Jacket/Overshirt',
                is_anchor_item: true,
                display_order: 1
              }])
              .select('id')
              .single();

            if (createError) {
              throw new DatabaseError(`Failed to create rollback category: ${createError.message}`);
            }

            // Move all items from Jacket and Overshirt back to Jacket/Overshirt
            const { error: updateError } = await this.supabase
              .from('wardrobe_items')
              .update({ category_id: newCategory.id })
              .eq('user_id', userId)
              .in('category_id', (await this.supabase
                .from('categories')
                .select('id')
                .eq('user_id', userId)
                .in('name', ['Jacket', 'Overshirt'])
              ).data?.map(c => c.id) || []);

            if (updateError) {
              throw new DatabaseError(`Failed to move items back: ${updateError.message}`);
            }

            // Remove the new categories
            const { error: deleteError } = await this.supabase
              .from('categories')
              .delete()
              .eq('user_id', userId)
              .in('name', ['Jacket', 'Overshirt']);

            if (deleteError) {
              throw new DatabaseError(`Failed to remove new categories: ${deleteError.message}`);
            }
          } else {
            this.logger.info(`[DRY RUN] Would rollback migration for user ${userId}`);
          }

          rollbackResults.successfulUsers++;

        } catch (userError) {
          this.logger.error(`Failed to rollback user ${userId}: ${userError.message}`);
          rollbackResults.errors.push({
            userId,
            error: userError.message
          });
          rollbackResults.failedUsers++;
        }
      }

      this.logger.success(`${dryRun ? '[DRY RUN] ' : ''}Rollback completed: ${rollbackResults.successfulUsers} successful, ${rollbackResults.failedUsers} failed`);
      return rollbackResults;

    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to rollback migration: ${error.message}`,
        { originalError: error.message }
      );
    }
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  const argv = parseArguments();
  const logger = new SecureLogger(argv.verbose);
  const startTime = new Date();
  
  try {
    logger.info('🚀 Starting Category Split Migration');
    logger.info(`Operation started at: ${startTime.toISOString()}`);
    
    // Log configuration
    logger.info('Configuration:', {
      dryRun: argv.dryRun,
      verbose: argv.verbose,
      rollback: argv.rollback
    });

    // Dry-run mode notification
    if (argv.dryRun) {
      logger.info('🧪 DRY RUN MODE: No database changes will be made');
    }

    // Validate environment variables
    logger.info('🔍 Validating environment...');
    const env = validateEnvironment(logger);
    logger.success('Environment validation completed');

    // Initialize migration system
    logger.info('🔗 Initializing migration system...');
    const migration = new CategoryMigration(env.supabaseUrl, env.serviceRoleKey, logger);
    const validator = new SimpleMigrationValidator(migration.supabase);
    logger.success('Migration system initialized');

    if (argv.validate) {
      // Perform validation only
      logger.info('🔍 Validating current migration status...');
      const validationReport = await validator.validateMigration();
      
      logger.info('Validation Report:');
      logger.info(`Valid: ${validationReport.isValid}`);
      if (validationReport.errors.length > 0) {
        logger.error('Errors:', validationReport.errors.join(', '));
      }
      if (validationReport.warnings.length > 0) {
        logger.warn('Warnings:', validationReport.warnings.join(', '));
      }
      
      if (validationReport.isValid) {
        logger.success('All users have valid migration status');
        process.exit(0);
      } else {
        logger.error('Migration validation failed for some users');
        process.exit(1);
      }
    } else if (argv.rollback) {
      // Validate rollback possibility first
      logger.info('🔍 Validating rollback possibility...');
      logger.info('Rollback validation not implemented in simplified validator');
      
      logger.warn('Proceeding without rollback validation check');
      
      // Skip rollback validation check for simplified validator
      logger.warn('Proceeding with rollback without validation check');

      // Perform rollback
      const rollbackResult = await migration.rollbackMigration(argv.dryRun);
      
      if (rollbackResult.failedUsers > 0) {
        logger.error(`Rollback completed with ${rollbackResult.failedUsers} failures`);
        process.exit(1);
      } else {
        logger.success('Rollback completed successfully');
        process.exit(0);
      }
    } else {
      // Perform forward migration
      logger.info('📋 Finding users with "Jacket/Overshirt" category...');
      const usersWithOldCategory = await migration.getUsersWithOldCategory();
      
      if (usersWithOldCategory.length === 0) {
        logger.info('No users found with "Jacket/Overshirt" category. Migration not needed.');
        process.exit(0);
      }

      logger.success(`Found ${usersWithOldCategory.length} users to migrate`);

      // Migrate each user
      const migrationResults = {
        totalUsers: usersWithOldCategory.length,
        successfulUsers: 0,
        failedUsers: 0,
        totalItemsMigrated: 0,
        totalJacketItems: 0,
        totalOvershirtItems: 0,
        errors: [],
        userResults: []
      };

      for (const userCategory of usersWithOldCategory) {
        try {
          const userResult = await migration.migrateUser(
            userCategory.user_id, 
            userCategory.id, 
            argv.dryRun
          );

          migrationResults.userResults.push(userResult);

          if (userResult.success) {
            migrationResults.successfulUsers++;
            migrationResults.totalItemsMigrated += userResult.itemsMigrated.total;
            migrationResults.totalJacketItems += userResult.itemsMigrated.jacket;
            migrationResults.totalOvershirtItems += userResult.itemsMigrated.overshirt;
          } else {
            migrationResults.failedUsers++;
            migrationResults.errors.push(...userResult.errors);
          }

        } catch (userError) {
          logger.error(`Failed to migrate user ${userCategory.user_id}: ${userError.message}`);
          migrationResults.failedUsers++;
          migrationResults.errors.push({
            userId: userCategory.user_id,
            error: userError.message
          });
        }
      }

      // Final summary
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      logger.info('📊 Migration Summary:');
      logger.info(`- Total users: ${migrationResults.totalUsers}`);
      logger.info(`- Successful: ${migrationResults.successfulUsers}`);
      logger.info(`- Failed: ${migrationResults.failedUsers}`);
      logger.info(`- Total items migrated: ${migrationResults.totalItemsMigrated}`);
      logger.info(`- Jacket items: ${migrationResults.totalJacketItems}`);
      logger.info(`- Overshirt items: ${migrationResults.totalOvershirtItems}`);
      logger.info(`- Duration: ${duration}ms`);

      if (migrationResults.failedUsers > 0) {
        logger.error(`Migration completed with ${migrationResults.failedUsers} failures`);
        logger.error('Errors:', migrationResults.errors);
        process.exit(1);
      } else {
        logger.success(`${argv.dryRun ? '[DRY RUN] ' : ''}Migration completed successfully`);
        
        // Perform final validation if not in dry-run mode
        if (!argv.dryRun) {
          logger.info('🔍 Performing final validation...');
          const finalValidation = await validator.validateMigration();
          
          logger.info('Final Validation Report:');
          logger.info(`Valid: ${finalValidation.isValid}`);
          if (finalValidation.errors.length > 0) {
            logger.error('Errors:', finalValidation.errors.join(', '));
          }
          if (finalValidation.warnings.length > 0) {
            logger.warn('Warnings:', finalValidation.warnings.join(', '));
          }
          
          if (!finalValidation.isValid) {
            logger.error('Final validation failed - migration may be incomplete');
            process.exit(1);
          }
          
          logger.success('Final validation and integrity check passed');
        }
        
        process.exit(0);
      }
    }

  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    logger.error('Migration failed:', {
      error: error.message,
      category: error.category || 'UNKNOWN',
      details: error.details || {},
      duration: `${duration}ms`
    });
    
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch(console.error);
}

export { CategoryMigration, runMigration };