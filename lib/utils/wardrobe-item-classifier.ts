import { WardrobeItem } from '@/lib/types/database';

/**
 * Classification rule interface for determining item categories
 */
export interface ClassificationRule {
  name: string;
  priority: number;
  matches(item: WardrobeItem): boolean;
  category: 'Jacket' | 'Overshirt';
}

/**
 * Interface for item classification functionality
 */
export interface ItemClassifier {
  classifyItem(item: WardrobeItem): 'Jacket' | 'Overshirt';
  getClassificationReason(item: WardrobeItem): string;
}

/**
 * Classification result with detailed information
 */
export interface ClassificationResult {
  category: 'Jacket' | 'Overshirt';
  reason: string;
  rule: string;
  confidence: number;
}

/**
 * Wardrobe item classifier that categorizes items into Jacket or Overshirt
 * based on priority-ordered rules and item characteristics
 */
export class WardrobeItemClassifier implements ItemClassifier {
  private rules: ClassificationRule[] = [];

  constructor(rules?: ClassificationRule[]) {
    if (rules) {
      this.rules = rules;
    } else {
      this.initializeDefaultRules();
    }
  }

  /**
   * Initialize default classification rules with priority ordering
   */
  private initializeDefaultRules(): void {
    // Jacket rules (higher priority)
    this.addRule({
      name: 'structured_outerwear',
      priority: 10,
      matches: (item) => /\b(coat|blazer|sportcoat|pea coat|trench|mac coat)\b/i.test(item.name),
      category: 'Jacket'
    });

    this.addRule({
      name: 'heavy_outerwear',
      priority: 9,
      matches: (item) => /\b(moto jacket|leather jacket|bomber|gilet|vest)\b/i.test(item.name),
      category: 'Jacket'
    });

    this.addRule({
      name: 'formal_outerwear',
      priority: 8,
      matches: (item) => (item.formality_score || 0) >= 7 && /jacket/i.test(item.name),
      category: 'Jacket'
    });

    this.addRule({
      name: 'structured_jacket_keywords',
      priority: 7,
      matches: (item) => /\b(suit jacket|dinner jacket|tuxedo|smoking jacket)\b/i.test(item.name),
      category: 'Jacket'
    });

    // Overshirt rules (lower priority)
    this.addRule({
      name: 'knit_outerwear',
      priority: 5,
      matches: (item) => /\b(cardigan|sweater|knit|pullover|hoodie|sweatshirt)\b/i.test(item.name),
      category: 'Overshirt'
    });

    this.addRule({
      name: 'casual_layering',
      priority: 4,
      matches: (item) => /\b(shacket|overshirt|shirt jacket|flannel|chambray)\b/i.test(item.name),
      category: 'Overshirt'
    });

    this.addRule({
      name: 'light_layers',
      priority: 3,
      matches: (item) => (item.formality_score || 0) <= 6 && 
        (/\b(layer|light|casual)\b/i.test(item.name) || 
         /\b(denim|corduroy|cotton)\b/i.test(item.material || '')),
      category: 'Overshirt'
    });

    this.addRule({
      name: 'casual_formality_score',
      priority: 2,
      matches: (item) => (item.formality_score || 0) <= 5,
      category: 'Overshirt'
    });
  }

  /**
   * Add a classification rule to the system
   */
  addRule(rule: ClassificationRule): void {
    this.rules.push(rule);
    // Keep rules sorted by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a classification rule by name
   */
  removeRule(ruleName: string): void {
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
  }

  /**
   * Get all classification rules sorted by priority
   */
  getRules(): ClassificationRule[] {
    return [...this.rules].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Classify a wardrobe item into Jacket or Overshirt category
   * Uses priority-based rule matching system
   */
  classifyItem(item: WardrobeItem): 'Jacket' | 'Overshirt' {
    // Sort rules by priority (highest first)
    const sortedRules = this.getRules();
    
    // Find first matching rule
    for (const rule of sortedRules) {
      if (rule.matches(item)) {
        return rule.category;
      }
    }
    
    // Default fallback to Overshirt for unmatched items
    return 'Overshirt';
  }

  /**
   * Get the classification reason for a wardrobe item
   * Provides detailed explanation of why an item was classified
   */
  getClassificationReason(item: WardrobeItem): string {
    const sortedRules = this.getRules();
    
    for (const rule of sortedRules) {
      if (rule.matches(item)) {
        return `Classified as ${rule.category} by rule: ${rule.name}`;
      }
    }
    
    return 'Classified as Overshirt by default fallback';
  }

  /**
   * Get detailed classification result with all information
   */
  getClassificationResult(item: WardrobeItem): ClassificationResult {
    const sortedRules = this.getRules();
    
    for (const rule of sortedRules) {
      if (rule.matches(item)) {
        return {
          category: rule.category,
          reason: `Classified as ${rule.category} by rule: ${rule.name}`,
          rule: rule.name,
          confidence: rule.priority / 10 // Convert priority to confidence score
        };
      }
    }
    
    return {
      category: 'Overshirt',
      reason: 'Classified as Overshirt by default fallback',
      rule: 'default_fallback',
      confidence: 0.1
    };
  }

  /**
   * Classify multiple items at once
   */
  classifyItems(items: WardrobeItem[]): Array<{
    item: WardrobeItem;
    category: 'Jacket' | 'Overshirt';
    reason: string;
  }> {
    return items.map(item => ({
      item,
      category: this.classifyItem(item),
      reason: this.getClassificationReason(item)
    }));
  }

  /**
   * Get statistics about classification rules
   */
  getRuleStatistics(): {
    totalRules: number;
    jacketRules: number;
    overshirtRules: number;
    averagePriority: number;
  } {
    const jacketRules = this.rules.filter(rule => rule.category === 'Jacket').length;
    const overshirtRules = this.rules.filter(rule => rule.category === 'Overshirt').length;
    const averagePriority = this.rules.length > 0 
      ? this.rules.reduce((sum, rule) => sum + rule.priority, 0) / this.rules.length 
      : 0;

    return {
      totalRules: this.rules.length,
      jacketRules,
      overshirtRules,
      averagePriority
    };
  }
}

/**
 * Default classifier instance with pre-configured rules
 */
export const defaultClassifier = new WardrobeItemClassifier();

/**
 * Utility function to classify a single item using the default classifier
 */
export function classifyWardrobeItem(item: WardrobeItem): 'Jacket' | 'Overshirt' {
  return defaultClassifier.classifyItem(item);
}

/**
 * Utility function to get classification reason using the default classifier
 */
export function getClassificationReason(item: WardrobeItem): string {
  return defaultClassifier.getClassificationReason(item);
}

/**
 * Utility function to get detailed classification result using the default classifier
 */
export function getClassificationResult(item: WardrobeItem): ClassificationResult {
  return defaultClassifier.getClassificationResult(item);
}