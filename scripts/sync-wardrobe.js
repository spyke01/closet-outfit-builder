#!/usr/bin/env node

/**
 * Wardrobe Sync Script
 * 
 * Securely syncs local wardrobe data files to Supabase database
 * Supports admin-only or all-users distribution modes
 */

import { config } from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

/**
 * Secure logging utility that prevents sensitive data exposure
 */
class SecureLogger {
  constructor(verbose = false) {
    this.verbose = verbose;
    this.sensitivePatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}\b/g, // UUIDs
      /\bsk_[a-zA-Z0-9_-]{10,}/g, // Service keys (at least 10 chars after sk_)
      /\bpk_[a-zA-Z0-9_-]{10,}/g, // Public keys (at least 10 chars after pk_)
      /\bsb_[a-zA-Z0-9_-]{10,}/g, // Supabase keys (at least 10 chars after sb_)
      /\bpassword['":\s]*['"]\s*[^'"]+['"]/gi, // Password fields (non-empty values)
      /\btoken['":\s]*['"]\s*[^'"]+['"]/gi, // Token fields (non-empty values)
      /\bapi[_-]?key['":\s]*['"]\s*[^'"]+['"]/gi, // API key fields (non-empty values)
    ];
  }

  /**
   * Sanitize message to remove sensitive information
   */
  sanitize(message) {
    if (typeof message !== 'string') {
      if (message === null || message === undefined) {
        return String(message);
      }
      message = JSON.stringify(message, null, 2);
    }

    let sanitized = message;
    
    // Apply each pattern individually for better control
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Special handling for @ symbols that might be in object keys but aren't emails
    // Only redact if it looks like an email (has domain structure)
    // The email regex above should handle proper emails, but let's be extra careful
    // about standalone @ symbols in JSON structures
    
    return sanitized;
  }

  info(message, ...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO:`, this.sanitize(message), ...args.map(arg => this.sanitize(arg)));
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
      console.log(`[${timestamp}] DEBUG:`, this.sanitize(message), ...args.map(arg => this.sanitize(arg)));
    }
  }

  success(message, ...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ SUCCESS:`, this.sanitize(message), ...args.map(arg => this.sanitize(arg)));
  }
}

/**
 * Custom error classes for different error categories
 */
class SyncError extends Error {
  constructor(message, category, details = {}) {
    super(message);
    this.name = 'SyncError';
    this.category = category;
    this.details = details;
  }
}

class ConfigurationError extends SyncError {
  constructor(message, details = {}) {
    super(message, 'CONFIGURATION', details);
    this.name = 'ConfigurationError';
  }
}

class ValidationError extends SyncError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION', details);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends SyncError {
  constructor(message, details = {}) {
    super(message, 'DATABASE', details);
    this.name = 'DatabaseError';
  }
}

class FileSystemError extends SyncError {
  constructor(message, details = {}) {
    super(message, 'FILESYSTEM', details);
    this.name = 'FileSystemError';
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
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    adminUserId: process.env.ADMIN_USER_ID,
    adminUserEmail: process.env.ADMIN_USER_EMAIL
  };
}

/**
 * Command-line argument configuration
 */
function parseArguments() {
  return yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('admin-only', {
      type: 'boolean',
      default: true,
      description: 'Sync items to admin user only (default: true)'
    })
    .option('all-users', {
      type: 'boolean',
      default: false,
      description: 'Sync items to all existing users'
    })
    .option('dry-run', {
      type: 'boolean',
      default: false,
      description: 'Validate data without making database changes'
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      default: false,
      description: 'Enable detailed logging'
    })
    .option('images-path', {
      type: 'string',
      default: './public/images/wardrobe',
      description: 'Path to wardrobe images directory'
    })
    .check((argv) => {
      // Handle mutual exclusivity manually to avoid default value conflicts
      if (argv['admin-only'] && argv['all-users']) {
        throw new Error('Arguments admin-only and all-users are mutually exclusive');
      }
      return true;
    })
    .help('h')
    .alias('h', 'help')
    .example('$0', 'Sync to admin user only (default)')
    .example('$0 --all-users', 'Sync to all existing users')
    .example('$0 --dry-run --verbose', 'Test run with detailed logging')
    .argv;
}

/**
 * DataValidator class for content validation
 * Handles validation of wardrobe items and outfits, plus color/season mapping
 */
class DataValidator {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Validate wardrobe item structure and required fields
   * @param {Object} item - Wardrobe item to validate
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validateWardrobeItem(item) {
    const errors = [];
    
    // Required fields validation
    if (!item.id || typeof item.id !== 'string') {
      errors.push('Item must have a valid string id');
    }
    
    if (!item.name || typeof item.name !== 'string') {
      errors.push('Item must have a valid string name');
    }
    
    if (!item.category || typeof item.category !== 'string') {
      errors.push('Item must have a valid string category');
    }

    // Optional fields type validation
    if (item.brand !== undefined && typeof item.brand !== 'string') {
      errors.push('Item brand must be a string if provided');
    }

    if (item.formalityScore !== undefined) {
      if (typeof item.formalityScore !== 'number' || item.formalityScore < 1 || item.formalityScore > 10) {
        errors.push('Item formalityScore must be a number between 1 and 10 if provided');
      }
    }

    if (item.capsuleTags !== undefined) {
      if (!Array.isArray(item.capsuleTags)) {
        errors.push('Item capsuleTags must be an array if provided');
      } else if (!item.capsuleTags.every(tag => typeof tag === 'string')) {
        errors.push('All capsuleTags must be strings');
      }
    }

    if (item.image !== undefined && item.image !== null && typeof item.image !== 'string') {
      errors.push('Item image must be a string or null if provided');
    }

    return {
      isValid: errors.length === 0,
      errors,
      item
    };
  }

  /**
   * Validate outfit structure and item references
   * @param {Object} outfit - Outfit to validate
   * @param {Array} wardrobeItems - Array of valid wardrobe items for reference checking
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validateOutfit(outfit, wardrobeItems = []) {
    const errors = [];
    const validItemIds = new Set(wardrobeItems.map(item => item.id));

    // Required fields validation
    if (!outfit.id || typeof outfit.id !== 'string') {
      errors.push('Outfit must have a valid string id');
    }

    if (!Array.isArray(outfit.items)) {
      errors.push('Outfit must have an items array');
    } else {
      // Validate item references
      const invalidRefs = outfit.items.filter(itemId => !validItemIds.has(itemId));
      if (invalidRefs.length > 0) {
        errors.push(`Outfit references non-existent items: ${invalidRefs.join(', ')}`);
      }

      if (outfit.items.length === 0) {
        errors.push('Outfit must contain at least one item');
      }
    }

    // Optional fields type validation
    if (outfit.tuck !== undefined && !['Tucked', 'Untucked'].includes(outfit.tuck)) {
      errors.push('Outfit tuck must be "Tucked" or "Untucked" if provided');
    }

    if (outfit.weight !== undefined && (typeof outfit.weight !== 'number' || outfit.weight < 0)) {
      errors.push('Outfit weight must be a non-negative number if provided');
    }

    if (outfit.loved !== undefined && typeof outfit.loved !== 'boolean') {
      errors.push('Outfit loved must be a boolean if provided');
    }

    return {
      isValid: errors.length === 0,
      errors,
      outfit
    };
  }

  /**
   * Extract color information from item names using existing color extraction logic
   * Based on the color extraction logic from generate-outfits.js
   * @param {string} name - Item name to extract color from
   * @returns {string|null} Extracted color or null if no color found
   */
  extractColor(name) {
    if (!name || typeof name !== 'string') {
      return null;
    }

    const source = name.toLowerCase();
    
    // Color palette in priority order (more specific colors first)
    const palette = [
      "white", "black", "navy", "blue", "light grey", "light-gray", "lightgrey", "grey", "gray",
      "khaki", "olive", "charcoal", "tan", "brown", "dark brown", "cream", "beige", "deep navy"
    ];
    
    // Search for exact color matches
    for (const token of palette) {
      const normalizedToken = token.replace(" ", "-");
      if (source.includes(normalizedToken) || source.includes(token)) {
        return normalizedToken;
      }
    }
    
    // Special case mappings for common terms
    if (/denim|jeans/.test(source)) return "navy";
    if (/charcoal/.test(source)) return "charcoal";
    
    // Return null if no color found (instead of "neutral" to distinguish from explicit neutral)
    return null;
  }

  /**
   * Map seasons based on capsule tags using existing season mapping logic
   * @param {Array} capsuleTags - Array of capsule tags
   * @returns {Array} Array of season strings
   */
  mapSeason(capsuleTags) {
    if (!Array.isArray(capsuleTags)) {
      return [];
    }

    const seasons = [];
    const tagSet = new Set(capsuleTags.map(tag => tag.toLowerCase()));

    // Season mapping based on capsule tags
    // These mappings are based on common seasonal associations
    if (tagSet.has('shorts') || tagSet.has('summer')) {
      seasons.push('Summer');
    }
    
    if (tagSet.has('winter') || tagSet.has('coat') || tagSet.has('heavy')) {
      seasons.push('Winter');
    }
    
    if (tagSet.has('spring') || tagSet.has('light')) {
      seasons.push('Spring');
    }
    
    if (tagSet.has('fall') || tagSet.has('autumn') || tagSet.has('jacket')) {
      seasons.push('Fall');
    }

    // Default seasonal assignments for common capsule types
    if (tagSet.has('refined')) {
      // Refined pieces are typically year-round but better in cooler weather
      if (seasons.length === 0) {
        seasons.push('Fall', 'Winter', 'Spring');
      }
    }
    
    if (tagSet.has('adventurer')) {
      // Adventurer pieces are typically more casual and weather-appropriate
      if (seasons.length === 0) {
        seasons.push('Spring', 'Summer', 'Fall');
      }
    }
    
    if (tagSet.has('crossover')) {
      // Crossover pieces are versatile and work year-round
      if (seasons.length === 0) {
        seasons.push('Spring', 'Summer', 'Fall', 'Winter');
      }
    }

    // If no specific season mapping found, default to year-round
    if (seasons.length === 0) {
      seasons.push('Spring', 'Summer', 'Fall', 'Winter');
    }

    return [...new Set(seasons)]; // Remove duplicates
  }

  /**
   * Check for duplicate items based on original IDs from wardrobeData
   * @param {Array} newItems - Array of new items to check (with original IDs)
   * @param {Array} existingItems - Array of existing items to compare against
   * @returns {Object} Report with duplicates and unique items
   */
  checkDuplicates(newItems, existingItems = []) {
    const duplicates = [];
    const unique = [];
    
    // Create a lookup set for existing items by their original_id or external_id
    // The existing items should have been inserted with an external_id field that matches the original ID
    const existingOriginalIds = new Set();
    existingItems.forEach(item => {
      // Check for external_id field (if we add it) or fall back to name+category matching
      if (item.external_id) {
        existingOriginalIds.add(item.external_id);
      } else {
        // Fallback to name+category for backward compatibility
        const key = `${item.name?.toLowerCase()}_${item.category?.toLowerCase()}`;
        existingOriginalIds.add(key);
      }
    });

    // Check each new item for duplicates using original ID
    newItems.forEach(newItem => {
      const originalId = newItem.id; // This is the original ID from wardrobeData
      const fallbackKey = `${newItem.name?.toLowerCase()}_${newItem.category?.toLowerCase()}`;
      
      // Check if this original ID already exists
      if (existingOriginalIds.has(originalId) || existingOriginalIds.has(fallbackKey)) {
        const existingMatches = existingItems.filter(existing => 
          existing.external_id === originalId || 
          (existing.name?.toLowerCase() === newItem.name?.toLowerCase() && 
           existing.category?.toLowerCase() === newItem.category?.toLowerCase())
        );
        
        duplicates.push({
          newItem,
          existingMatches,
          reason: 'original_id_match'
        });
      } else {
        unique.push(newItem);
      }
    });

    return {
      duplicates,
      unique,
      totalNew: newItems.length,
      duplicateCount: duplicates.length,
      uniqueCount: unique.length
    };
  }

  /**
   * Check for duplicate outfits based on original IDs from outfitData
   * @param {Array} newOutfits - Array of new outfits to check (with original IDs)
   * @param {Array} existingOutfits - Array of existing outfits to compare against
   * @returns {Object} Report with duplicates and unique outfits
   */
  checkOutfitDuplicates(newOutfits, existingOutfits = []) {
    const duplicates = [];
    const unique = [];
    
    // Create a lookup set for existing outfits by their original_id or external_id
    const existingOriginalIds = new Set();
    existingOutfits.forEach(outfit => {
      if (outfit.external_id) {
        existingOriginalIds.add(outfit.external_id);
      }
    });

    // Check each new outfit for duplicates using original ID
    newOutfits.forEach(newOutfit => {
      const originalId = newOutfit.id; // This is the original ID from outfitData
      
      // Check if this original ID already exists
      if (existingOriginalIds.has(originalId)) {
        const existingMatches = existingOutfits.filter(existing => 
          existing.external_id === originalId
        );
        
        duplicates.push({
          newOutfit,
          existingMatches,
          reason: 'original_id_match'
        });
      } else {
        unique.push(newOutfit);
      }
    });

    return {
      duplicates,
      unique,
      totalNew: newOutfits.length,
      duplicateCount: duplicates.length,
      uniqueCount: unique.length
    };
  }
}

/**
 * DataLoader class for loading data from seed-user Edge Function file
 * Reads wardrobeData and outfitData directly from the seed-user source file
 */
class DataLoader {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Load wardrobe data from seed-user Edge Function file
   * @returns {Object} Wardrobe data with items array
   */
  loadWardrobeData() {
    try {
      this.logger.info('Loading wardrobe data from seed-user Edge Function file');
      
      const seedUserPath = './supabase/functions/seed-user/index.ts';
      
      // Check if seed-user file exists
      if (!fs.existsSync(seedUserPath)) {
        throw new FileSystemError(`Seed-user file not found: ${seedUserPath}`);
      }

      // Read the seed-user file content
      const fileContent = fs.readFileSync(seedUserPath, 'utf8');
      
      // Extract wardrobeData array from the file
      const wardrobeDataMatch = fileContent.match(/const wardrobeData[^=]*=\s*(\[[\s\S]*?\]);/);
      
      if (!wardrobeDataMatch) {
        throw new ValidationError('Could not find wardrobeData array in seed-user file');
      }

      // Parse the wardrobeData array
      let wardrobeData;
      try {
        // Clean up the array string and evaluate it
        const arrayString = wardrobeDataMatch[1];
        wardrobeData = eval(`(${arrayString})`);
      } catch (parseError) {
        throw new ValidationError(`Failed to parse wardrobeData array: ${parseError.message}`);
      }

      if (!Array.isArray(wardrobeData)) {
        throw new ValidationError('wardrobeData must be an array');
      }

      this.logger.success(`Loaded ${wardrobeData.length} wardrobe items from seed-user source`);
      return { items: wardrobeData };
    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }
      throw new ValidationError(`Failed to load wardrobe data: ${error.message}`);
    }
  }

  /**
   * Load outfit data from seed-user Edge Function file
   * @returns {Object} Outfit data with outfits array
   */
  loadOutfitData() {
    try {
      this.logger.info('Loading outfit data from seed-user Edge Function file');
      
      const seedUserPath = './supabase/functions/seed-user/index.ts';
      
      // Check if seed-user file exists
      if (!fs.existsSync(seedUserPath)) {
        throw new FileSystemError(`Seed-user file not found: ${seedUserPath}`);
      }

      // Read the seed-user file content
      const fileContent = fs.readFileSync(seedUserPath, 'utf8');
      
      // Extract outfitData array from the file
      const outfitDataMatch = fileContent.match(/const outfitData[^=]*=\s*(\[[\s\S]*?\]);/);
      
      if (!outfitDataMatch) {
        throw new ValidationError('Could not find outfitData array in seed-user file');
      }

      // Parse the outfitData array
      let outfitData;
      try {
        // Clean up the array string and evaluate it
        const arrayString = outfitDataMatch[1];
        outfitData = eval(`(${arrayString})`);
      } catch (parseError) {
        throw new ValidationError(`Failed to parse outfitData array: ${parseError.message}`);
      }

      if (!Array.isArray(outfitData)) {
        throw new ValidationError('outfitData must be an array');
      }

      this.logger.success(`Loaded ${outfitData.length} outfits from seed-user source`);
      return { outfits: outfitData };
    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }
      throw new ValidationError(`Failed to load outfit data: ${error.message}`);
    }
  }

  /**
   * Validate image assets exist in the filesystem
   * @param {Array} items - Array of wardrobe items with image references
   * @param {string} imagesBasePath - Base path to images directory
   * @returns {Object} Validation result with valid/invalid items
   */
  validateImageAssets(items, imagesBasePath) {
    const validItems = [];
    const invalidItems = [];
    const missingImages = [];
    const unsupportedExtensions = [];

    this.logger.debug(`Validating image assets in: ${imagesBasePath}`);

    // Supported image file extensions
    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

    for (const item of items) {
      if (!item.image) {
        // Item has no image reference - this is valid
        validItems.push(item);
        continue;
      }

      // Validate file extension
      const extension = path.extname(item.image).toLowerCase();
      if (!supportedExtensions.includes(extension)) {
        this.logger.warn(`Unsupported image extension for item ${item.id}: ${item.image} (supported: ${supportedExtensions.join(', ')})`);
        invalidItems.push(item);
        unsupportedExtensions.push({
          itemId: item.id,
          imagePath: item.image,
          extension: extension,
          supportedExtensions
        });
        continue;
      }

      // Construct full path to image file
      // The image paths from seed-user start with /images/wardrobe/, so we need to convert to filesystem path
      let imagePath;
      if (item.image.startsWith('/images/wardrobe/')) {
        // Convert web path to filesystem path
        const filename = item.image.replace('/images/wardrobe/', '');
        imagePath = path.join(imagesBasePath, filename);
      } else {
        // Fallback for other path formats
        imagePath = path.join(imagesBasePath, item.image);
      }
      
      if (fs.existsSync(imagePath)) {
        validItems.push(item);
      } else {
        this.logger.warn(`Missing image for item ${item.id}: ${imagePath}`);
        invalidItems.push(item);
        missingImages.push({
          itemId: item.id,
          imagePath: item.image,
          fullPath: imagePath
        });
      }
    }

    const result = {
      valid: validItems,
      invalid: invalidItems,
      missingImages,
      unsupportedExtensions,
      totalItems: items.length,
      validCount: validItems.length,
      invalidCount: invalidItems.length,
      supportedExtensions
    };

    this.logger.debug(`Image validation complete: ${result.validCount}/${result.totalItems} items have valid images`);
    
    if (result.invalidCount > 0) {
      this.logger.warn(`${result.invalidCount} items have missing or invalid images`);
    }

    return result;
  }

  /**
   * Validate and format image paths for wardrobe items
   * Ensures paths are relative and properly formatted
   * @param {Array} items - Array of wardrobe items with image references
   * @returns {Array} Array of items with formatted image paths
   */
  formatImagePaths(items) {
    return items.map(item => {
      if (!item.image) {
        return item;
      }

      let imagePath = item.image;
      
      // Normalize path separators to forward slashes
      imagePath = imagePath.replace(/\\/g, '/');
      
      // Remove any double slashes
      imagePath = imagePath.replace(/\/+/g, '/');

      // The paths from seed-user are already properly formatted, so just return them
      return {
        ...item,
        image: imagePath
      };
    });
  }

  /**
   * Handle missing images gracefully by setting image_url to null
   * @param {Array} items - Array of wardrobe items
   * @param {Object} validationResult - Result from validateImageAssets
   * @returns {Array} Array of items with null image_url for missing images
   */
  handleMissingImages(items, validationResult) {
    const missingImageIds = new Set(
      validationResult.missingImages.map(missing => missing.itemId)
    );
    const unsupportedImageIds = new Set(
      validationResult.unsupportedExtensions.map(unsupported => unsupported.itemId)
    );

    return items.map(item => {
      if (missingImageIds.has(item.id) || unsupportedImageIds.has(item.id)) {
        this.logger.warn(`Setting image_url to null for item ${item.id} due to missing or invalid image`);
        return {
          ...item,
          image: null
        };
      }
      return item;
    });
  }

  /**
   * Process wardrobe items with image validation and formatting
   * @param {Array} items - Array of wardrobe items to process
   * @param {string} imagesBasePath - Base path to images directory
   * @returns {Array} Array of processed items with validated images
   */
  processItemsWithImageValidation(items, imagesBasePath) {
    this.logger.info('🖼️ Processing items with image validation...');
    
    // Format image paths to ensure consistency
    let processedItems = this.formatImagePaths(items);
    
    // Validate image assets exist
    const validationResult = this.validateImageAssets(processedItems, imagesBasePath);
    
    // Handle missing images gracefully
    processedItems = this.handleMissingImages(processedItems, validationResult);
    
    // Log validation summary
    if (validationResult.invalidCount > 0) {
      this.logger.warn(`Image validation: ${validationResult.validCount}/${validationResult.totalItems} items have valid images`);
      this.logger.warn(`${validationResult.missingImages.length} missing images, ${validationResult.unsupportedExtensions.length} unsupported extensions`);
    } else {
      this.logger.success(`Image validation: ${validationResult.validCount}/${validationResult.totalItems} items have valid images`);
    }
    
    return processedItems;
  }
}

/**
 * DatabaseSync class for Supabase database operations
 * Handles user targeting, category mapping, and data insertion
 */
class DatabaseSync {
  constructor(supabaseUrl, serviceRoleKey, logger) {
    this.logger = logger;
    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    this.logger.debug('DatabaseSync initialized with Supabase client');
  }

  /**
   * Get target users based on admin-only or all-users mode
   * @param {boolean} adminOnly - If true, return only admin user; if false, return all users
   * @param {string} adminUserId - Admin user ID from environment
   * @param {string} adminUserEmail - Admin user email from environment (fallback)
   * @returns {Promise<Array>} Array of user objects with id and email
   */
  async getTargetUsers(adminOnly = true, adminUserId = null, adminUserEmail = null) {
    try {
      this.logger.debug(`Getting target users (adminOnly: ${adminOnly})`);

      if (adminOnly) {
        // Admin-only mode: get specific admin user
        let adminUser = null;

        if (adminUserId) {
          // Try to get admin user by ID first
          const { data: userById, error: userByIdError } = await this.supabase.auth.admin.getUserById(adminUserId);
          
          if (userByIdError) {
            this.logger.warn(`Failed to get admin user by ID: ${userByIdError.message}`);
          } else if (userById?.user) {
            adminUser = {
              id: userById.user.id,
              email: userById.user.email
            };
          }
        }

        if (!adminUser && adminUserEmail) {
          // Fallback to getting admin user by email
          const { data: users, error: usersError } = await this.supabase.auth.admin.listUsers();
          
          if (usersError) {
            throw new DatabaseError(
              `Failed to list users for admin lookup: ${usersError.message}`,
              { adminUserEmail, error: usersError }
            );
          }

          const foundUser = users.users?.find(user => user.email === adminUserEmail);
          if (foundUser) {
            adminUser = {
              id: foundUser.id,
              email: foundUser.email
            };
          }
        }

        if (!adminUser) {
          throw new ConfigurationError(
            'Admin user not found. Please set ADMIN_USER_ID or ADMIN_USER_EMAIL environment variable.',
            { adminUserId, adminUserEmail }
          );
        }

        this.logger.debug(`Found admin user: ${adminUser.email}`);
        return [adminUser];

      } else {
        // All-users mode: get all existing users
        const { data: users, error: usersError } = await this.supabase.auth.admin.listUsers();
        
        if (usersError) {
          throw new DatabaseError(
            `Failed to list users: ${usersError.message}`,
            { error: usersError }
          );
        }

        const targetUsers = users.users?.map(user => ({
          id: user.id,
          email: user.email
        })) || [];

        this.logger.debug(`Found ${targetUsers.length} users for sync`);
        return targetUsers;
      }

    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to get target users: ${error.message}`,
        { adminOnly, adminUserId, adminUserEmail, originalError: error.message }
      );
    }
  }

  /**
   * Get categories for a specific user, creating default categories if needed
   * @param {string} userId - User ID to get categories for
   * @returns {Promise<Array>} Array of category objects with id, name, and is_anchor_item
   */
  async getCategoriesForUser(userId) {
    try {
      this.logger.debug(`Getting categories for user: ${userId}`);

      // Get existing categories for the user
      const { data: existingCategories, error: categoriesError } = await this.supabase
        .from('categories')
        .select('id, name, is_anchor_item, display_order')
        .eq('user_id', userId)
        .order('display_order');

      if (categoriesError) {
        throw new DatabaseError(
          `Failed to fetch categories for user: ${categoriesError.message}`,
          { userId, error: categoriesError }
        );
      }

      // Default categories that should exist for all users
      const defaultCategories = [
        { name: 'Jacket', is_anchor_item: true, display_order: 1 },
        { name: 'Overshirt', is_anchor_item: true, display_order: 2 },
        { name: 'Shirt', is_anchor_item: true, display_order: 3 },
        { name: 'Undershirt', is_anchor_item: false, display_order: 4 },
        { name: 'Pants', is_anchor_item: true, display_order: 5 },
        { name: 'Shoes', is_anchor_item: true, display_order: 6 },
        { name: 'Belt', is_anchor_item: false, display_order: 7 },
        { name: 'Watch', is_anchor_item: false, display_order: 8 }
      ];

      const existingCategoryNames = new Set(existingCategories?.map(cat => cat.name.toLowerCase()) || []);
      const categoriesToCreate = defaultCategories.filter(
        defaultCat => !existingCategoryNames.has(defaultCat.name.toLowerCase())
      );

      // Create missing default categories
      if (categoriesToCreate.length > 0) {
        this.logger.debug(`Creating ${categoriesToCreate.length} missing categories for user ${userId}`);
        
        const newCategories = categoriesToCreate.map(cat => ({
          user_id: userId,
          name: cat.name,
          is_anchor_item: cat.is_anchor_item,
          display_order: cat.display_order
        }));

        const { data: createdCategories, error: createError } = await this.supabase
          .from('categories')
          .insert(newCategories)
          .select('id, name, is_anchor_item, display_order');

        if (createError) {
          throw new DatabaseError(
            `Failed to create default categories: ${createError.message}`,
            { userId, categoriesToCreate, error: createError }
          );
        }

        this.logger.debug(`Created ${createdCategories?.length || 0} new categories`);
      }

      // Get all categories for the user (existing + newly created)
      const { data: allCategories, error: allCategoriesError } = await this.supabase
        .from('categories')
        .select('id, name, is_anchor_item, display_order')
        .eq('user_id', userId)
        .order('display_order');

      if (allCategoriesError) {
        throw new DatabaseError(
          `Failed to fetch all categories for user: ${allCategoriesError.message}`,
          { userId, error: allCategoriesError }
        );
      }

      this.logger.debug(`Retrieved ${allCategories?.length || 0} categories for user ${userId}`);
      return allCategories || [];

    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to get categories for user: ${error.message}`,
        { userId, originalError: error.message }
      );
    }
  }

  /**
   * Map category name to category ID for a user
   * @param {string} categoryName - Name of the category to find
   * @param {Array} userCategories - Array of user's categories
   * @returns {string|null} Category ID or null if not found
   */
  mapCategoryNameToId(categoryName, userCategories) {
    if (!categoryName || !Array.isArray(userCategories)) {
      return null;
    }

    const category = userCategories.find(
      cat => cat.name.toLowerCase() === categoryName.toLowerCase()
    );

    return category ? category.id : null;
  }

  /**
   * Get existing wardrobe items for a user to check for duplicates
   * @param {string} userId - User ID to get items for
   * @returns {Promise<Array>} Array of existing wardrobe items
   */
  async getExistingWardrobeItems(userId) {
    try {
      this.logger.debug(`Getting existing wardrobe items for user: ${userId}`);

      const { data: existingItems, error: itemsError } = await this.supabase
        .from('wardrobe_items')
        .select(`
          id,
          name,
          category_id,
          brand,
          color,
          formality_score,
          capsule_tags,
          season,
          image_url,
          active,
          external_id,
          categories!inner(name)
        `)
        .eq('user_id', userId)
        .eq('active', true);

      if (itemsError) {
        throw new DatabaseError(
          `Failed to fetch existing wardrobe items: ${itemsError.message}`,
          { userId, error: itemsError }
        );
      }

      // Transform the data to include category name for duplicate checking
      const items = (existingItems || []).map(item => ({
        id: item.id,
        name: item.name,
        category: item.categories?.name,
        category_id: item.category_id,
        brand: item.brand,
        color: item.color,
        formality_score: item.formality_score,
        capsule_tags: item.capsule_tags,
        season: item.season,
        image_url: item.image_url,
        active: item.active,
        external_id: item.external_id // Include external_id for duplicate checking
      }));

      this.logger.debug(`Retrieved ${items.length} existing wardrobe items for user ${userId}`);
      return items;

    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to get existing wardrobe items: ${error.message}`,
        { userId, originalError: error.message }
      );
    }
  }

  /**
   * Insert wardrobe items for a specific user
   * @param {string} userId - User ID to insert items for
   * @param {Array} items - Array of wardrobe items to insert
   * @param {Array} userCategories - Array of user's categories for mapping
   * @param {Object} dataValidator - DataValidator instance for processing
   * @returns {Promise<Object>} Insert result with success/failure counts
   */
  async insertWardrobeItems(userId, items, userCategories, dataValidator) {
    try {
      this.logger.debug(`Inserting ${items.length} wardrobe items for user: ${userId}`);

      const results = {
        inserted: [],
        skipped: [],
        errors: [],
        totalItems: items.length,
        insertedCount: 0,
        skippedCount: 0,
        errorCount: 0
      };

      // Progress indicator for long operations
      if (items.length > 10) {
        this.logger.info(`📊 Processing ${items.length} wardrobe items for user ${userId}...`);
      }

      // Get existing items for duplicate checking
      this.logger.debug('🔍 Checking for existing items...');
      const existingItems = await this.getExistingWardrobeItems(userId);
      
      // Check for duplicates
      this.logger.debug('🔍 Checking for duplicates...');
      const duplicateCheck = dataValidator.checkDuplicates(items, existingItems);
      
      if (duplicateCheck.duplicateCount > 0) {
        this.logger.warn(`Found ${duplicateCheck.duplicateCount} duplicate items that will be skipped`);
        duplicateCheck.duplicates.forEach(dup => {
          results.skipped.push({
            item: dup.newItem,
            reason: 'duplicate',
            existingMatches: dup.existingMatches.length
          });
        });
        results.skippedCount = duplicateCheck.duplicateCount;
      }

      // Process unique items for insertion
      const itemsToInsert = duplicateCheck.unique;
      
      if (itemsToInsert.length === 0) {
        this.logger.info(`No new items to insert for user ${userId} (all duplicates)`);
        return results;
      }

      // Progress indicator for transformation
      if (itemsToInsert.length > 10) {
        this.logger.info(`🔄 Transforming ${itemsToInsert.length} items to database format...`);
      }

      // Transform items to database format
      const dbItems = itemsToInsert.map((item, index) => {
        // Progress indicator for large datasets
        if (itemsToInsert.length > 50 && (index + 1) % 25 === 0) {
          this.logger.info(`🔄 Transformed ${index + 1}/${itemsToInsert.length} items...`);
        }

        const categoryId = this.mapCategoryNameToId(item.category, userCategories);
        
        if (!categoryId) {
          results.errors.push({
            item,
            error: `Category not found: ${item.category}`
          });
          return null;
        }

        return {
          user_id: userId,
          category_id: categoryId,
          name: item.name,
          brand: item.brand || null,
          color: dataValidator.extractColor(item.name) || null,
          formality_score: item.formalityScore || null,
          capsule_tags: item.capsuleTags || null,
          season: dataValidator.mapSeason(item.capsuleTags || []),
          image_url: item.image || null,
          active: true,
          external_id: item.id // Store the original ID from wardrobeData for duplicate checking
        };
      }).filter(item => item !== null);

      // Insert items in batches to avoid overwhelming the database
      const batchSize = 50;
      const totalBatches = Math.ceil(dbItems.length / batchSize);
      
      if (totalBatches > 1) {
        this.logger.info(`💾 Inserting ${dbItems.length} items in ${totalBatches} batches...`);
      }

      for (let i = 0; i < dbItems.length; i += batchSize) {
        const batch = dbItems.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        // Progress indicator for batch processing
        if (totalBatches > 1) {
          this.logger.info(`💾 Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);
        }
        
        const { data: insertedItems, error: insertError } = await this.supabase
          .from('wardrobe_items')
          .insert(batch)
          .select('id, name, category_id');

        if (insertError) {
          this.logger.error(`Failed to insert batch ${batchNumber}: ${insertError.message}`);
          batch.forEach(item => {
            results.errors.push({
              item: itemsToInsert.find(orig => orig.name === item.name),
              error: insertError.message
            });
          });
        } else {
          const insertedCount = insertedItems?.length || 0;
          results.inserted.push(...(insertedItems || []));
          results.insertedCount += insertedCount;
          
          if (totalBatches > 1) {
            this.logger.info(`✅ Batch ${batchNumber}/${totalBatches} completed: ${insertedCount} items inserted`);
          } else {
            this.logger.debug(`Inserted batch ${batchNumber}: ${insertedCount} items`);
          }
        }
      }

      results.errorCount = results.errors.length;

      this.logger.info(`Wardrobe items insertion complete for user ${userId}: ${results.insertedCount} inserted, ${results.skippedCount} skipped, ${results.errorCount} errors`);
      return results;

    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to insert wardrobe items: ${error.message}`,
        { userId, itemCount: items.length, originalError: error.message }
      );
    }
  }

  /**
   * Get existing outfits for a user to check for duplicates
   * @param {string} userId - User ID to get outfits for
   * @returns {Promise<Array>} Array of existing outfits with their items
   */
  async getExistingOutfits(userId) {
    try {
      this.logger.debug(`Getting existing outfits for user: ${userId}`);

      const { data: existingOutfits, error: outfitsError } = await this.supabase
        .from('outfits')
        .select(`
          id,
          name,
          tuck_style,
          weight,
          loved,
          source,
          external_id,
          outfit_items!inner(
            item_id,
            wardrobe_items!inner(name)
          )
        `)
        .eq('user_id', userId);

      if (outfitsError) {
        throw new DatabaseError(
          `Failed to fetch existing outfits: ${outfitsError.message}`,
          { userId, error: outfitsError }
        );
      }

      // Transform the data to include item IDs for duplicate checking
      const outfits = (existingOutfits || []).map(outfit => ({
        id: outfit.id,
        name: outfit.name,
        tuck_style: outfit.tuck_style,
        weight: outfit.weight,
        loved: outfit.loved,
        source: outfit.source,
        external_id: outfit.external_id, // Include external_id for duplicate checking
        items: outfit.outfit_items?.map(oi => oi.item_id) || []
      }));

      this.logger.debug(`Retrieved ${outfits.length} existing outfits for user ${userId}`);
      return outfits;

    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to get existing outfits: ${error.message}`,
        { userId, originalError: error.message }
      );
    }
  }

  /**
   * Insert outfits for a specific user
   * @param {string} userId - User ID to insert outfits for
   * @param {Array} outfits - Array of outfits to insert
   * @param {Array} userWardrobeItems - Array of user's wardrobe items for reference mapping
   * @returns {Promise<Object>} Insert result with success/failure counts
   */
  async insertOutfits(userId, outfits, userWardrobeItems) {
    try {
      this.logger.debug(`Inserting ${outfits.length} outfits for user: ${userId}`);

      const results = {
        inserted: [],
        skipped: [],
        errors: [],
        totalOutfits: outfits.length,
        insertedCount: 0,
        skippedCount: 0,
        errorCount: 0
      };

      // Progress indicator for long operations
      if (outfits.length > 5) {
        this.logger.info(`👔 Processing ${outfits.length} outfits for user ${userId}...`);
      }

      // Get existing outfits for duplicate checking
      this.logger.debug('� Crhecking for existing outfits...');
      const existingOutfits = await this.getExistingOutfits(userId);
      
      // Check for duplicates using DataValidator
      this.logger.debug('🔍 Checking for outfit duplicates...');
      const dataValidator = new DataValidator(this.logger);
      const duplicateCheck = dataValidator.checkOutfitDuplicates(outfits, existingOutfits);
      
      if (duplicateCheck.duplicateCount > 0) {
        this.logger.warn(`Found ${duplicateCheck.duplicateCount} duplicate outfits that will be skipped`);
        duplicateCheck.duplicates.forEach(dup => {
          results.skipped.push({
            outfit: dup.newOutfit,
            reason: 'duplicate',
            existingMatches: dup.existingMatches.length
          });
        });
        results.skippedCount = duplicateCheck.duplicateCount;
      }

      // Process unique outfits for insertion
      const outfitsToInsert = duplicateCheck.unique;
      
      if (outfitsToInsert.length === 0) {
        this.logger.info(`No new outfits to insert for user ${userId} (all duplicates)`);
        return results;
      }

      // Create a mapping from local item IDs to database item IDs
      this.logger.debug('🔗 Creating item ID mapping...');
      const itemIdMap = new Map();
      userWardrobeItems.forEach(item => {
        // Map by external_id first (for items inserted by this script), then by name (fallback)
        if (item.external_id) {
          itemIdMap.set(item.external_id, item.id);
        } else {
          // Fallback to name matching for existing items
          itemIdMap.set(item.name, item.id);
        }
      });

      // Process each outfit
      let processedCount = 0;
      for (const outfit of outfitsToInsert) {
        processedCount++;
        
        // Progress indicator for large datasets
        if (outfitsToInsert.length > 10 && processedCount % 5 === 0) {
          this.logger.info(`👔 Processing outfit ${processedCount}/${outfitsToInsert.length}...`);
        }

        try {
          // Map local item IDs to database item IDs
          const dbItemIds = [];
          const missingItems = [];

          for (const localItemId of outfit.items) {
            // Try to find the item by external_id first (for items inserted by this script)
            let dbItem = userWardrobeItems.find(item => item.external_id === localItemId);
            
            if (!dbItem) {
              // Fallback: try to find by name for backward compatibility
              dbItem = userWardrobeItems.find(item => item.name === localItemId);
            }

            if (dbItem) {
              dbItemIds.push(dbItem.id);
            } else {
              missingItems.push(localItemId);
            }
          }

          if (missingItems.length > 0) {
            results.errors.push({
              outfit,
              error: `Missing wardrobe items: ${missingItems.join(', ')}`
            });
            continue;
          }

          if (dbItemIds.length === 0) {
            results.errors.push({
              outfit,
              error: 'No valid wardrobe items found for outfit'
            });
            continue;
          }

          // Calculate the actual outfit score
          let score = 0;
          try {
            const { data: scoreData, error: scoreError } = await this.supabase.functions.invoke('score-outfit', {
              body: { 
                item_ids: dbItemIds,
                user_id: userId 
              }
            });
            
            if (scoreError) {
              this.logger.warn(`Scoring Edge Function error for outfit ${outfit.id}: ${scoreError.message}`);
              score = Math.min(dbItemIds.length * 15, 100); // Fallback scoring
            } else if (scoreData?.score !== undefined) {
              score = scoreData.score;
              this.logger.debug(`Calculated score for outfit ${outfit.id}: ${score}`);
            } else {
              this.logger.warn(`No score returned for outfit ${outfit.id}, using fallback`);
              score = Math.min(dbItemIds.length * 15, 100); // Fallback scoring
            }
          } catch (error) {
            this.logger.warn(`Scoring failed for outfit ${outfit.id}, using fallback: ${error.message}`);
            score = Math.min(dbItemIds.length * 15, 100); // Fallback scoring
          }

          // Create the outfit record
          const outfitData = {
            user_id: userId,
            name: outfit.name || `Outfit ${outfit.id.replace('o-', '')}`,
            tuck_style: outfit.tuck === 'Tucked' ? 'Tucked' : outfit.tuck === 'Untucked' ? 'Untucked' : null,
            weight: outfit.weight || 1,
            loved: outfit.loved || false,
            source: 'curated',
            score: score,
            external_id: outfit.id // Store the original ID from outfitData for duplicate checking
          };

          const { data: insertedOutfit, error: outfitError } = await this.supabase
            .from('outfits')
            .insert([outfitData])
            .select('id, name')
            .single();

          if (outfitError) {
            results.errors.push({
              outfit,
              error: `Failed to insert outfit: ${outfitError.message}`
            });
            continue;
          }

          // Create outfit_items relationships
          const outfitItems = dbItemIds.map(itemId => {
            // Get the category_id for this item
            const wardrobeItem = userWardrobeItems.find(item => item.id === itemId);
            return {
              outfit_id: insertedOutfit.id,
              item_id: itemId,
              category_id: wardrobeItem?.category_id
            };
          });

          const { error: itemsError } = await this.supabase
            .from('outfit_items')
            .insert(outfitItems);

          if (itemsError) {
            // Try to clean up the outfit record if outfit_items insertion failed
            await this.supabase
              .from('outfits')
              .delete()
              .eq('id', insertedOutfit.id);

            results.errors.push({
              outfit,
              error: `Failed to insert outfit items: ${itemsError.message}`
            });
            continue;
          }

          results.inserted.push(insertedOutfit);
          results.insertedCount++;
          
          if (outfits.length > 10) {
            this.logger.debug(`✅ Outfit ${processedCount}/${outfits.length}: ${insertedOutfit.name || insertedOutfit.id}`);
          } else {
            this.logger.debug(`Inserted outfit: ${insertedOutfit.name || insertedOutfit.id}`);
          }

        } catch (error) {
          results.errors.push({
            outfit,
            error: `Unexpected error: ${error.message}`
          });
        }
      }

      results.errorCount = results.errors.length;

      this.logger.info(`Outfits insertion complete for user ${userId}: ${results.insertedCount} inserted, ${results.skippedCount} skipped, ${results.errorCount} errors`);
      return results;

    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to insert outfits: ${error.message}`,
        { userId, outfitCount: outfits.length, originalError: error.message }
      );
    }
  }
}

/**
 * Main sync function that wires together all modules
 * Integrates DataLoader, DataValidator, and DatabaseSync
 * Implements command-line flag processing and dry-run mode
 */
async function syncWardrobe() {
  const argv = parseArguments();
  const logger = new SecureLogger(argv.verbose);
  const startTime = new Date();
  
  try {
    logger.info('🚀 Starting Wardrobe Sync Script');
    logger.info(`Operation started at: ${startTime.toISOString()}`);
    
    // Log configuration with proper flag processing
    const targetMode = argv.allUsers ? 'all-users' : 'admin-only';
    logger.info('Configuration:', {
      targetMode,
      dryRun: argv.dryRun,
      verbose: argv.verbose,
      imagesPath: argv.imagesPath,
      dataSource: 'seed-user Edge Function'
    });

    // Dry-run mode notification
    if (argv.dryRun) {
      logger.info('🧪 DRY RUN MODE: No database changes will be made');
    }

    // Validate environment variables
    logger.info('🔍 Validating environment...');
    const env = validateEnvironment(logger);
    logger.success('Environment validation completed');

    // Initialize modules - DataLoader, DataValidator, and DatabaseSync
    logger.info('🔗 Initializing modules...');
    const dataLoader = new DataLoader(logger);
    const dataValidator = new DataValidator(logger);
    
    // Only initialize database connection if not in dry-run mode
    let databaseSync = null;
    if (!argv.dryRun) {
      databaseSync = new DatabaseSync(env.supabaseUrl, env.serviceRoleKey, logger);
      logger.success('Database connection initialized');
    } else {
      logger.info('DRY RUN: Skipping database connection initialization');
    }
    
    logger.success('All modules initialized successfully');
    // Load and validate data files using DataLoader
    logger.info('📁 Loading data files...');
    const wardrobeData = dataLoader.loadWardrobeData();
    const outfitData = dataLoader.loadOutfitData();
    
    // Validate image assets using DataLoader
    wardrobeData.items = dataLoader.processItemsWithImageValidation(wardrobeData.items, argv.imagesPath);
    
    logger.success(`Data loading completed: ${wardrobeData.items.length} wardrobe items, ${outfitData.outfits.length} outfits`);

    // Validate wardrobe items structure using DataValidator
    logger.info('🔍 Validating wardrobe items...');
    const itemValidationResults = wardrobeData.items.map(item => dataValidator.validateWardrobeItem(item));
    const invalidItems = itemValidationResults.filter(result => !result.isValid);
    
    if (invalidItems.length > 0) {
      logger.error(`Found ${invalidItems.length} invalid wardrobe items:`);
      invalidItems.forEach(result => {
        logger.error(`Item ${result.item.id}: ${result.errors.join(', ')}`);
      });
      throw new ValidationError(`${invalidItems.length} wardrobe items failed validation`);
    }

    // Validate outfits structure and references using DataValidator
    logger.info('🔍 Validating outfits...');
    const outfitValidationResults = outfitData.outfits.map(outfit => 
      dataValidator.validateOutfit(outfit, wardrobeData.items)
    );
    const invalidOutfits = outfitValidationResults.filter(result => !result.isValid);
    
    if (invalidOutfits.length > 0) {
      logger.error(`Found ${invalidOutfits.length} invalid outfits:`);
      invalidOutfits.forEach(result => {
        logger.error(`Outfit ${result.outfit.id}: ${result.errors.join(', ')}`);
      });
      throw new ValidationError(`${invalidOutfits.length} outfits failed validation`);
    }

    logger.success('Data validation completed successfully');

    // In dry-run mode, stop here after validation
    if (argv.dryRun) {
      const dryRunEndTime = new Date();
      const duration = dryRunEndTime.getTime() - startTime.getTime();
      logger.success('🧪 DRY RUN COMPLETE: All validations passed. No database changes were made.');
      logger.info('Summary of what would be processed:');
      logger.info(`- ${wardrobeData.items.length} wardrobe items would be processed`);
      logger.info(`- ${outfitData.outfits.length} outfits would be processed`);
      logger.info(`- Target mode: ${targetMode}`);
      logger.info(`Dry run completed at: ${dryRunEndTime.toISOString()}`);
      logger.info(`Total duration: ${duration}ms`);
      logger.success('Dry run completed successfully - exiting with code 0');
      process.exit(0);
    }

    // Get target users for sync using DatabaseSync
    logger.info('👥 Getting target users...');
    const targetUsers = await databaseSync.getTargetUsers(
      !argv.allUsers, // adminOnly is the inverse of allUsers
      env.adminUserId, 
      env.adminUserEmail
    );
    logger.success(`Found ${targetUsers.length} target user(s) for sync`);

    // Process each user
    const syncResults = {
      totalUsers: targetUsers.length,
      successfulUsers: 0,
      failedUsers: 0,
      totalItemsInserted: 0,
      totalItemsSkipped: 0,
      totalOutfitsInserted: 0,
      totalOutfitsSkipped: 0,
      errors: [],
      userSummaries: [] // Enhanced per-user tracking
    };

    for (const user of targetUsers) {
      const userStartTime = new Date();
      const userSummary = {
        userId: user.id,
        email: user.email,
        startTime: userStartTime,
        endTime: null,
        duration: 0,
        itemsInserted: 0,
        itemsSkipped: 0,
        itemsErrors: 0,
        outfitsInserted: 0,
        outfitsSkipped: 0,
        outfitsErrors: 0,
        success: false,
        errors: []
      };

      try {
        logger.info(`📦 Processing user: ${user.email} (${user.id})`);

        // Get or create categories for this user using DatabaseSync
        const userCategories = await databaseSync.getCategoriesForUser(user.id);
        logger.debug(`Retrieved ${userCategories.length} categories for user ${user.id}`);

        // Insert wardrobe items using DatabaseSync and DataValidator
        if (wardrobeData.items.length > 0) {
          logger.info(`📝 Inserting ${wardrobeData.items.length} wardrobe items for user ${user.email}...`);
          
          const itemResults = await databaseSync.insertWardrobeItems(
            user.id, 
            wardrobeData.items, 
            userCategories, 
            dataValidator
          );
          
          // Update user summary
          userSummary.itemsInserted = itemResults.insertedCount;
          userSummary.itemsSkipped = itemResults.skippedCount;
          userSummary.itemsErrors = itemResults.errorCount;
          
          // Update global totals
          syncResults.totalItemsInserted += itemResults.insertedCount;
          syncResults.totalItemsSkipped += itemResults.skippedCount;
          
          if (itemResults.errorCount > 0) {
            logger.warn(`${itemResults.errorCount} items had errors for user ${user.email}`);
            const itemErrors = itemResults.errors.map(err => ({
              user: user.email,
              type: 'wardrobe_item',
              error: err.error,
              item: err.item
            }));
            syncResults.errors.push(...itemErrors);
            userSummary.errors.push(...itemErrors);
          }
          
          logger.success(`Wardrobe items: ${itemResults.insertedCount} inserted, ${itemResults.skippedCount} skipped, ${itemResults.errorCount} errors`);
        }

        // Insert outfits using DatabaseSync
        if (outfitData.outfits.length > 0) {
          logger.info(`👔 Inserting ${outfitData.outfits.length} outfits for user ${user.email}...`);
          
          // Get user's wardrobe items for outfit reference mapping
          const userWardrobeItems = await databaseSync.getExistingWardrobeItems(user.id);
          
          const outfitResults = await databaseSync.insertOutfits(
            user.id, 
            outfitData.outfits, 
            userWardrobeItems
          );
          
          // Update user summary
          userSummary.outfitsInserted = outfitResults.insertedCount;
          userSummary.outfitsSkipped = outfitResults.skippedCount;
          userSummary.outfitsErrors = outfitResults.errorCount;
          
          // Update global totals
          syncResults.totalOutfitsInserted += outfitResults.insertedCount;
          syncResults.totalOutfitsSkipped += outfitResults.skippedCount;
          
          if (outfitResults.errorCount > 0) {
            logger.warn(`${outfitResults.errorCount} outfits had errors for user ${user.email}`);
            const outfitErrors = outfitResults.errors.map(err => ({
              user: user.email,
              type: 'outfit',
              error: err.error,
              outfit: err.outfit
            }));
            syncResults.errors.push(...outfitErrors);
            userSummary.errors.push(...outfitErrors);
          }
          
          logger.success(`Outfits: ${outfitResults.insertedCount} inserted, ${outfitResults.skippedCount} skipped, ${outfitResults.errorCount} errors`);
        }

        // Mark user as successful
        userSummary.success = true;
        syncResults.successfulUsers++;
        
        // Calculate user processing time
        userSummary.endTime = new Date();
        userSummary.duration = userSummary.endTime.getTime() - userSummary.startTime.getTime();
        
        logger.success(`✅ Completed sync for user: ${user.email} (${userSummary.duration}ms)`);

      } catch (error) {
        syncResults.failedUsers++;
        userSummary.success = false;
        userSummary.endTime = new Date();
        userSummary.duration = userSummary.endTime.getTime() - userSummary.startTime.getTime();
        
        const userError = {
          user: user.email,
          type: 'user_sync',
          error: error.message
        };
        
        syncResults.errors.push(userError);
        userSummary.errors.push(userError);
        
        logger.error(`❌ Failed to sync user ${user.email}: ${error.message}`);
        
        if (error instanceof SyncError) {
          logger.error('Error details:', error.details);
        }
      } finally {
        // Always add user summary to results
        syncResults.userSummaries.push(userSummary);
      }
    }

    // Generate final summary report with timestamps and per-user details
    const endTime = new Date();
    const totalDuration = endTime.getTime() - startTime.getTime();
    
    logger.info('📊 Sync Summary Report:');
    logger.info(`Operation started at: ${startTime.toISOString()}`);
    logger.info(`Operation completed at: ${endTime.toISOString()}`);
    logger.info(`Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    logger.info(`Users: ${syncResults.successfulUsers}/${syncResults.totalUsers} successful`);
    logger.info(`Wardrobe Items: ${syncResults.totalItemsInserted} inserted, ${syncResults.totalItemsSkipped} skipped`);
    logger.info(`Outfits: ${syncResults.totalOutfitsInserted} inserted, ${syncResults.totalOutfitsSkipped} skipped`);
    
    // Per-user summary details
    if (syncResults.userSummaries.length > 0) {
      logger.info('📋 Per-User Summary:');
      syncResults.userSummaries.forEach((userSummary, index) => {
        const userDurationSec = (userSummary.duration / 1000).toFixed(2);
        const status = userSummary.success ? '✅' : '❌';
        
        logger.info(`${status} User ${index + 1}: ${userSummary.email}`);
        logger.info(`   Duration: ${userDurationSec}s`);
        logger.info(`   Items: ${userSummary.itemsInserted} inserted, ${userSummary.itemsSkipped} skipped, ${userSummary.itemsErrors} errors`);
        logger.info(`   Outfits: ${userSummary.outfitsInserted} inserted, ${userSummary.outfitsSkipped} skipped, ${userSummary.outfitsErrors} errors`);
        
        if (userSummary.errors.length > 0) {
          logger.warn(`   Errors (${userSummary.errors.length}):`);
          userSummary.errors.forEach((error, errorIndex) => {
            logger.warn(`     ${errorIndex + 1}. ${error.type}: ${error.error}`);
          });
        }
      });
    }
    
    if (syncResults.errors.length > 0) {
      logger.warn(`Total Errors: ${syncResults.errors.length}`);
      
      // Group errors by type for better reporting
      const errorsByType = syncResults.errors.reduce((acc, error) => {
        if (!acc[error.type]) {
          acc[error.type] = [];
        }
        acc[error.type].push(error);
        return acc;
      }, {});
      
      Object.entries(errorsByType).forEach(([type, errors]) => {
        logger.error(`${type} errors (${errors.length}):`);
        errors.slice(0, 5).forEach((error, index) => { // Show first 5 errors of each type
          logger.error(`  ${index + 1}. [${error.user}] ${error.error}`);
        });
        if (errors.length > 5) {
          logger.error(`  ... and ${errors.length - 5} more ${type} errors`);
        }
      });
    }

    // Determine exit code based on results
    if (syncResults.failedUsers > 0) {
      logger.error(`❌ ${syncResults.failedUsers} user(s) failed to sync completely`);
      logger.error('Sync completed with errors - exiting with code 1');
      process.exit(1);
    } else if (syncResults.errors.length > 0) {
      logger.warn('⚠️ Sync completed with some item/outfit errors but all users processed');
      logger.info('Sync completed with warnings - exiting with code 0');
      process.exit(0);
    } else {
      logger.success('🎉 Wardrobe sync completed successfully with no errors');
      logger.success('Sync completed successfully - exiting with code 0');
      process.exit(0);
    }

  } catch (error) {
    // Enhanced error handling with proper exit codes
    if (error instanceof SyncError) {
      logger.error(`${error.category}: ${error.message}`, error.details);
      logger.error('Sync failed due to application error - exiting with code 2');
      process.exit(2);
    } else {
      logger.error('Unexpected error occurred', { 
        message: error.message,
        stack: error.stack 
      });
      logger.error('Sync failed due to unexpected error - exiting with code 3');
      process.exit(3);
    }
  }
}

// Handle uncaught exceptions and unhandled rejections with proper exit codes
if (!process.env.VITEST && !process.env.NODE_ENV?.includes('test')) {
  process.on('uncaughtException', (error) => {
    const logger = new SecureLogger();
    logger.error('Uncaught exception occurred', { message: error.message });
    logger.error('Process terminating due to uncaught exception - exiting with code 4');
    process.exit(4);
  });

  process.on('unhandledRejection', (reason) => {
    const logger = new SecureLogger();
    logger.error('Unhandled promise rejection occurred', { reason: reason?.toString() });
    logger.error('Process terminating due to unhandled rejection - exiting with code 5');
    process.exit(5);
  });
}

// Run the sync if this file is executed directly (not during testing)
if (import.meta.url === `file://${process.argv[1]}` && !process.env.VITEST && !process.env.NODE_ENV?.includes('test')) {
  syncWardrobe();
}

export {
  SecureLogger,
  SyncError,
  ConfigurationError,
  ValidationError,
  DatabaseError,
  FileSystemError,
  validateEnvironment,
  DataLoader,
  DataValidator,
  DatabaseSync
};